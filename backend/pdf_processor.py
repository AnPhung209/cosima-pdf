from __future__ import annotations
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
import fitz


@dataclass
class BBox:
    x: float
    y: float
    width: float
    height: float


@dataclass
class TextChunk:
    chunk_id: str
    text: str
    page_number: int
    char_start: int
    char_end: int
    bbox: BBox
    snippet: str = field(init=False)

    def __post_init__(self) -> None:
        self.snippet = self.text[:130].strip()
        if len(self.text) > 130:
            self.snippet += "…"


def _approx_tokens(text: str) -> int:
    return max(1, int(len(text.split()) / 0.75))


_SENT_RE = re.compile(r'(?<=[.!?])\s+')


def _split_sentences(text: str) -> list[str]:
    return [p.strip() for p in _SENT_RE.split(text.strip()) if p.strip()]


@dataclass
class _Span:
    text: str
    page_number: int
    bbox: BBox
    char_offset: int


def _extract_spans_native(doc: fitz.Document) -> list[_Span]:
    """Extract text spans from a PDF with native (selectable) text."""
    spans: list[_Span] = []
    char_offset = 0

    for page_index in range(len(doc)):
        page: fitz.Page = doc[page_index]
        page_number = page_index + 1
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]

        for block in blocks:
            if block.get("type") != 0:
                continue
            parts: list[str] = []
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    t = span.get("text", "").strip()
                    if t:
                        parts.append(t)
            text = " ".join(parts).strip()
            if not text:
                continue
            r = fitz.Rect(block["bbox"])
            spans.append(_Span(
                text=text,
                page_number=page_number,
                bbox=BBox(x=r.x0, y=r.y0, width=r.width, height=r.height),
                char_offset=char_offset,
            ))
            char_offset += len(text) + 1

    return spans


def _ocr_page(page: fitz.Page, page_number: int, char_offset: int, dpi: int = 300) -> tuple[list[_Span], int]:
    """OCR a single page using Tesseract via PyMuPDF and return spans."""
    import subprocess, tempfile, csv, io
    spans: list[_Span] = []

    # Render page to high-res image
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")

    # Run tesseract with TSV output for bounding boxes
    with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp:
        tmp.write(img_bytes)
        tmp.flush()
        try:
            result = subprocess.run(
                ["tesseract", tmp.name, "stdout", "--dpi", str(dpi), "-l", "eng", "tsv"],
                capture_output=True, text=True, timeout=60,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return spans, char_offset

    if result.returncode != 0:
        return spans, char_offset

    # Parse TSV — group words by block
    reader = csv.DictReader(io.StringIO(result.stdout), delimiter="\t")
    scale = 72.0 / dpi  # convert pixel coords back to PDF points

    blocks: dict[str, dict] = {}
    for row in reader:
        try:
            conf = int(float(row.get("conf", -1)))
            text = row.get("text", "").strip()
            if conf < 30 or not text:
                continue
            block_num = row.get("block_num", "0")
            key = f"{row.get('block_num','0')}_{row.get('par_num','0')}"
            if key not in blocks:
                blocks[key] = {"words": [], "x0": float("inf"), "y0": float("inf"), "x1": 0, "y1": 0}
            b = blocks[key]
            b["words"].append(text)
            x, y, w, h = int(row["left"]), int(row["top"]), int(row["width"]), int(row["height"])
            b["x0"] = min(b["x0"], x)
            b["y0"] = min(b["y0"], y)
            b["x1"] = max(b["x1"], x + w)
            b["y1"] = max(b["y1"], y + h)
        except (KeyError, ValueError):
            continue

    for b in blocks.values():
        text = " ".join(b["words"]).strip()
        if not text:
            continue
        spans.append(_Span(
            text=text,
            page_number=page_number,
            bbox=BBox(
                x=b["x0"] * scale,
                y=b["y0"] * scale,
                width=(b["x1"] - b["x0"]) * scale,
                height=(b["y1"] - b["y0"]) * scale,
            ),
            char_offset=char_offset,
        ))
        char_offset += len(text) + 1

    return spans, char_offset


def _extract_spans(doc: fitz.Document) -> list[_Span]:
    """Try native text extraction first; fall back to OCR for image-based pages."""
    spans = _extract_spans_native(doc)
    if spans:
        return spans

    # No native text found — OCR all pages
    import logging
    logging.getLogger(__name__).info("No native text found, running OCR on %d pages…", len(doc))
    all_spans: list[_Span] = []
    char_offset = 0
    for page_index in range(len(doc)):
        page = doc[page_index]
        page_spans, char_offset = _ocr_page(page, page_index + 1, char_offset)
        all_spans.extend(page_spans)
    return all_spans


def _build_chunks(spans: list[_Span], chunk_tokens: int = 300, overlap_tokens: int = 50) -> list[TextChunk]:
    # Flatten to (sentence, span) pairs
    entries: list[tuple[str, _Span]] = []
    for span in spans:
        for sent in _split_sentences(span.text):
            entries.append((sent, span))

    if not entries:
        return []

    chunks: list[TextChunk] = []
    i = 0

    while i < len(entries):
        window_sents: list[str] = []
        window_spans: list[_Span] = []
        token_count = 0
        j = i

        while j < len(entries):
            sent, span = entries[j]
            t = _approx_tokens(sent)
            if token_count + t > chunk_tokens and window_sents:
                break
            window_sents.append(sent)
            window_spans.append(span)
            token_count += t
            j += 1

        if not window_sents:
            window_sents.append(entries[i][0])
            window_spans.append(entries[i][1])
            j = i + 1

        chunk_text = " ".join(window_sents)
        primary = window_spans[0]

        same_page = [s for s in window_spans if s.page_number == primary.page_number]
        min_x = min(s.bbox.x for s in same_page)
        min_y = min(s.bbox.y for s in same_page)
        max_x = max(s.bbox.x + s.bbox.width for s in same_page)
        max_y = max(s.bbox.y + s.bbox.height for s in same_page)
        merged = BBox(x=min_x, y=min_y, width=max_x - min_x, height=max_y - min_y)

        chunks.append(TextChunk(
            chunk_id=str(uuid.uuid4()),
            text=chunk_text,
            page_number=primary.page_number,
            char_start=primary.char_offset,
            char_end=primary.char_offset + len(chunk_text),
            bbox=merged,
        ))

        # Overlap step back
        overlap_t = 0
        overlap_count = 0
        for sent in reversed(window_sents):
            t = _approx_tokens(sent)
            if overlap_t + t > overlap_tokens:
                break
            overlap_t += t
            overlap_count += 1

        step = max(1, len(window_sents) - overlap_count)
        i += step

    return chunks


def parse_pdf(file_path: Path, chunk_tokens: int = 200, overlap_tokens: int = 0) -> tuple[list[TextChunk], int]:
    doc: fitz.Document = fitz.open(str(file_path))
    page_count = len(doc)
    spans = _extract_spans(doc)
    doc.close()
    chunks = _build_chunks(spans, chunk_tokens=chunk_tokens, overlap_tokens=overlap_tokens)
    return chunks, page_count

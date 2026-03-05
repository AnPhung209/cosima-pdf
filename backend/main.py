from __future__ import annotations
import asyncio
import hashlib
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse
import ai_reasoning
import embeddings as emb
import pdf_processor as pdfp
from models import (BoundingBox, DeleteHighlightResponse, RelatedChunk, RelatedTextRequest, RelatedTextResponse, UploadResponse)

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(name)s — %(message)s")
logging.getLogger("google_genai").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
CACHE_DIR = BASE_DIR / "cache"
UPLOADS_DIR = BASE_DIR / "uploads"

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

_highlight_store: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set — AI features will fail")
    yield


app = FastAPI(title="Cosima PDF Semantic Search API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_api_key() -> str:
    if not GOOGLE_API_KEY:
        raise HTTPException(500, "GOOGLE_API_KEY is not configured on the server.")
    return GOOGLE_API_KEY


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _find_pdf(pdf_id: str) -> Path:
    matches = list(UPLOADS_DIR.glob(f"{pdf_id}.*"))
    if not matches:
        raise HTTPException(404, f"PDF '{pdf_id}' not found. Upload the file first.")
    return matches[0]


def _build_result(chunk, score, reasoning="") -> dict:
    return RelatedChunk(
        id=chunk.chunk_id,
        page=chunk.page_number,
        snippet=chunk.snippet,
        score=round(score, 4),
        char_start=chunk.char_start,
        char_end=chunk.char_end,
        bbox=BoundingBox(x=chunk.bbox.x, y=chunk.bbox.y,
                         width=chunk.bbox.width, height=chunk.bbox.height),
        reasoning=reasoning,
    ).model_dump()


# --- POST /api/upload ---

@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    filename = file.filename or "upload.pdf"
    content_type = file.content_type or ""

    if "pdf" not in content_type.lower() and not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Uploaded file must be a PDF.")

    data = await file.read()
    if not data:
        raise HTTPException(400, "Uploaded file is empty.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "File does not appear to be a valid PDF.")

    api_key = _require_api_key()
    pdf_id = _sha256(data)
    ext = Path(filename).suffix or ".pdf"
    pdf_path = UPLOADS_DIR / f"{pdf_id}{ext}"

    if not pdf_path.exists():
        pdf_path.write_bytes(data)
        logger.info("Saved PDF %s (%d bytes)", pdf_path.name, len(data))

    try:
        chunks, page_count = pdfp.parse_pdf(pdf_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to parse PDF: {e}") from e

    if not chunks:
        raise HTTPException(400, "No extractable text found in the PDF.")

    if emb.index_exists(CACHE_DIR, pdf_id):
        _, cached = emb.load_index(CACHE_DIR, pdf_id)
        return UploadResponse(pdf_id=pdf_id, filename=filename, page_count=page_count,
                              chunk_count=len(cached), cached=True)

    try:
        emb.build_index(api_key, chunks, CACHE_DIR, pdf_id)
    except Exception as e:
        raise HTTPException(500, f"Failed to build semantic index: {e}") from e

    return UploadResponse(pdf_id=pdf_id, filename=filename, page_count=page_count,
                          chunk_count=len(chunks), cached=False)


# --- POST /api/related-text (streaming SSE) ---

@app.post("/api/related-text")
async def related_text(body: RelatedTextRequest):
    api_key = _require_api_key()

    if not emb.index_exists(CACHE_DIR, body.pdf_id):
        raise HTTPException(404, f"No index for pdf_id '{body.pdf_id}'. Upload the PDF first.")

    try:
        index, chunks = emb.load_index(CACHE_DIR, body.pdf_id)
    except Exception as e:
        raise HTTPException(500, f"Failed to load search index: {e}") from e

    try:
        raw = emb.search(api_key, body.query, index, chunks, top_k=body.top_k)
    except Exception as e:
        raise HTTPException(500, f"Semantic search failed: {e}") from e

    # Filter to results with >= % confidence
    raw = [(chunk, score) for chunk, score in raw if score >= 0.60]

    if not raw:
        async def empty_generator():
            yield {
                "event": "results",
                "data": json.dumps({"results": [], "query": body.query, "pdf_id": body.pdf_id}),
            }
            yield {"event": "done", "data": "{}"}
        return EventSourceResponse(empty_generator())

    # Build results without reasoning first
    results = [_build_result(chunk, score) for chunk, score in raw]

    async def event_generator():
        # 1) Send results immediately (no reasoning yet)
        yield {
            "event": "results",
            "data": json.dumps({
                "results": results,
                "query": body.query,
                "pdf_id": body.pdf_id,
            }),
        }

        # 2) Stream reasoning for each result as it completes
        if not GOOGLE_API_KEY:
            return

        sem = asyncio.Semaphore(4)

        async def get_reasoning(idx: int, text: str, score: float):
            async with sem:
                try:
                    r = await ai_reasoning._reason_one(api_key, body.query, text, score)
                except Exception:
                    r = "Semantically related content identified."
                return idx, r

        tasks = [
            get_reasoning(i, chunk.text, score)
            for i, (chunk, score) in enumerate(raw)
        ]

        for coro in asyncio.as_completed(tasks):
            idx, reasoning = await coro
            yield {
                "event": "reasoning",
                "data": json.dumps({"index": idx, "reasoning": reasoning}),
            }

        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


# --- GET /api/pdf/{pdf_id} ---

@app.get("/api/pdf/{pdf_id}")
async def serve_pdf(pdf_id: str) -> Response:
    pdf_path = _find_pdf(pdf_id)
    return Response(
        content=pdf_path.read_bytes(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{pdf_path.name}"',
            "Cache-Control": "public, max-age=3600",
        },
    )


# --- DELETE /api/highlights/{highlight_id} ---

@app.delete("/api/highlights/{highlight_id}", response_model=DeleteHighlightResponse)
async def delete_highlight(highlight_id: str) -> DeleteHighlightResponse:
    if highlight_id not in _highlight_store:
        raise HTTPException(404, f"Highlight '{highlight_id}' not found.")
    del _highlight_store[highlight_id]
    return DeleteHighlightResponse(highlight_id=highlight_id, deleted=True)


# --- Health ---

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": app.version}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

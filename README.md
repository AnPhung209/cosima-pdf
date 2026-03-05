# Cosima — PDF Semantic Search

A full-stack web app to view PURE PDFs only, highlight text, and find semantically related passages using AI.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PDF Rendering | react-pdf (PDF.js) |
| State | Zustand (localStorage persistence) |
| Backend | Python FastAPI |
| PDF Parsing | PyMuPDF (fitz) |
| Embeddings | Google `gemini-embedding-001` |
| Vector Store | FAISS (in-memory, cached to disk) |
| Reasoning | Google `gemini-2.5-pro` |

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your GOOGLE_API_KEY

python main.py
# Server runs at http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vite)                      │
│                     http://localhost:5173                    │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │     PDF Viewer        │  │       Side Panel            │  │
│  │  (react-pdf / PDF.js) │  │  Highlights | Results tabs  │  │
│  │                       │  │                             │  │
│  │  • Text selection     │  │  • Highlight cards          │  │
│  │  • Highlight overlays │  │  • "Find Related" button    │  │
│  │  • Jump target pulse  │  │  • Result cards + Jump      │  │
│  │    (framer-motion)    │  │  • Score badges             │  │
│  └──────────┬───────────┘  │  • AI reasoning (expand)    │  │
│             │              └──────────┬──────────────────┘  │
│             │    Zustand store        │                     │
│             │  (localStorage persist) │                     │
└─────────────┼─────────────────────────┼─────────────────────┘
              │  Vite proxy /api →      │
              ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│                   http://localhost:8000                      │
│                                                             │
│  POST /api/upload ──► PyMuPDF parse ──► Chunk text          │
│                       (OCR fallback)    (~300 tokens)       │
│                                             │               │
│                                             ▼               │
│                                    Gemini Embedding API     │
│                                   (gemini-embedding-001)    │
│                                             │               │
│                                             ▼               │
│                                     FAISS IndexFlatIP       │
│                                    (cached to disk)         │
│                                                             │
│  POST /api/related-text ──► Embed query ──► FAISS search    │
│                                                │            │
│                                                ▼            │
│                                       Top-8 results         │
│                                                │            │
│                                                ▼            │
│                                     Gemini 2.5 Pro          │
│                                   (reasoning per result)    │
│                                                │            │
│                                                ▼            │
│                                     JSON response           │
│                                  (snippet, page, bbox,      │
│                                   score, reasoning)         │
│                                                             │
│  GET /api/pdf/{id} ──► Serve PDF bytes from uploads/        │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### AI / Embedding Strategy

**Chosen Approach: Embedding-based search + LLM-based reasoning (Hybrid of approaches 1 & 2)**

We combine embedding-based vector search for fast retrieval with LLM-based reasoning for result explanation. This was chosen over pure keyword/BM25 because business documents often use varied terminology for the same concepts (e.g., "payment terms" vs "billing schedule"), where semantic similarity outperforms exact keyword matching.

**Why not pure LLM re-ranking?** Sending the entire PDF to an LLM for every query would be slow and expensive. Embedding search narrows candidates in milliseconds, then Gemini only processes the top 8 results.

**Third-party services used:**
- **Google `gemini-embedding-001`** — text embedding model (3072 dimensions)
- **Google `gemini-2.5-pro`** — LLM for generating match reasoning explanations
- **FAISS** (Meta, open-source) — in-memory vector similarity search, no external service needed

**Pipeline:**

1. **PDF Ingestion** — PyMuPDF extracts text blocks with bounding boxes per page. Falls back to Tesseract OCR for scanned/image-based PDFs.
2. **Chunking** — Sentence-aware sliding window (~300 tokens/chunk, 50-token overlap) keeps semantic units intact while ensuring sufficient context per chunk.
3. **Embedding** — Google `gemini-embedding-001` (3072-dim) embeds all chunks. Vectors are L2-normalized for cosine similarity via inner product.
4. **Vector Store** — FAISS `IndexFlatIP` (inner product = cosine similarity on normalized vectors). Index cached to disk keyed by SHA-256 of PDF bytes — re-uploading the same PDF skips re-embedding.
5. **Search** — User's highlighted text is embedded with the same model (using `RETRIEVAL_QUERY` task type for optimized query embeddings), then searched via FAISS top-8.
6. **Reasoning** — Google `gemini-2.5-pro` generates a one-sentence explanation for each result, giving users insight into *why* a passage is semantically related (concurrent async calls, capped at 4 simultaneous).

**Trade-offs:**
| Decision | Pro | Con |
|----------|-----|-----|
| Embedding search over BM25 | Captures semantic meaning, not just keywords | Requires API call for embedding |
| FAISS over Pinecone/pgvector | Zero infrastructure, instant setup, no cost | In-memory only, not suited for 1000+ page PDFs |
| Gemini reasoning per result | Users understand *why* results match | Adds ~2-3s latency to search response |
| 300-token chunks with overlap | Good balance of context and granularity | Some redundancy in overlapping regions |

### Locating Matched Areas

The backend stores PDF-space bounding boxes (origin bottom-left, in points) for each chunk from PyMuPDF. The frontend converts these to CSS coordinates:

```
top = (page_height - bbox.y - bbox.height) * scale
left = bbox.x * scale
```

Where `scale = rendered_page_width_px / 612` (standard PDF page width in points).

### Jump + Visual Indication

When the user clicks "Jump", the app:
1. Scrolls the target page into view
2. Overlays a `framer-motion` animated box at the computed CSS coordinates
3. Pulses the border with a `#C17B6E` glow (3 pulses, ~2.5s), then fades out

## API Reference

### `POST /api/upload`
Upload a PDF. Returns `pdf_id` (SHA-256 of file), page count, chunk count.

### `POST /api/related-text`

**Request:**
```json
{ "query": "highlighted text", "pdf_id": "abc123", "top_k": 8 }
```

**Response:**
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "page": 1,
      "snippet": "~130 characters of matched text...",
      "score": 0.8723,
      "char_start": 420,
      "char_end": 580,
      "bbox": { "x": 72.0, "y": 650.0, "width": 468.0, "height": 40.0 },
      "reasoning": "Both passages reference monthly billing schedules for client support services."
    }
  ],
  "query": "highlighted text",
  "pdf_id": "abc123"
}
```

### `GET /api/pdf/{pdf_id}`
Serves raw PDF bytes for the viewer.

## Bonus Features Implemented

- **Multi-highlight support** — multiple concurrent highlights, "Find Related" on any of them
- **AI-generated match explanation** — Gemini 2.5 Pro generates a one-sentence reasoning per result, shown in an expandable section
- **PDF upload** — drag-and-drop or file picker in the UI; any PDF accepted
- **Persistent state** — highlights saved to localStorage across browser sessions via Zustand `persist` middleware
- **OCR support** — scanned/image-based PDFs are automatically processed via Tesseract OCR fallback

## Known Limitations / Trade-offs

- **In-memory FAISS** — works well up to ~500 pages; larger PDFs may need a proper vector DB.
- **Bounding boxes are chunk-level** — they span the full block range of the chunk, not character-precise.
- **Highlights are viewport-relative** — if the user resizes the window, overlay positions may shift slightly.
- **No streaming** — results wait for all Gemini reasoning calls to complete before returning.

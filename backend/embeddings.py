from __future__ import annotations
import logging
import pickle
from pathlib import Path
import faiss
from google.genai import Client
import numpy as np
from pdf_processor import TextChunk

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 3072
BATCH_SIZE = 100


def _normalize(vecs: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return vecs / norms


def _embed_texts(api_key: str, texts: list[str]) -> np.ndarray:
    client = Client(api_key=api_key)
    all_embeddings: list[list[float]] = []

    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start : start + BATCH_SIZE]
        # Batch call: pass list of texts to embed in one API request
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
        )
        for emb_obj in result.embeddings:
            all_embeddings.append(emb_obj.values)
        logger.info("Embedded batch of %d texts (offset %d)", len(batch), start)

    return _normalize(np.array(all_embeddings, dtype=np.float32))


def _embed_query(api_key: str, text: str) -> np.ndarray:
    client = Client(api_key=api_key)
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
    )
    vec = np.array([result.embeddings[0].values], dtype=np.float32)
    return _normalize(vec)


def _index_path(cache_dir: Path, pdf_id: str) -> Path:
    return cache_dir / f"{pdf_id}.faiss"


def _meta_path(cache_dir: Path, pdf_id: str) -> Path:
    return cache_dir / f"{pdf_id}.meta.pkl"


def index_exists(cache_dir: Path, pdf_id: str) -> bool:
    return _index_path(cache_dir, pdf_id).exists() and _meta_path(cache_dir, pdf_id).exists()


def save_index(cache_dir: Path, pdf_id: str, index: faiss.IndexFlatIP, chunks: list[TextChunk]) -> None:
    faiss.write_index(index, str(_index_path(cache_dir, pdf_id)))
    with open(_meta_path(cache_dir, pdf_id), "wb") as f:
        pickle.dump(chunks, f)
    logger.info("Saved FAISS index for %s (%d chunks)", pdf_id, len(chunks))


def load_index(cache_dir: Path, pdf_id: str) -> tuple[faiss.IndexFlatIP, list[TextChunk]]:
    index = faiss.read_index(str(_index_path(cache_dir, pdf_id)))
    with open(_meta_path(cache_dir, pdf_id), "rb") as f:
        chunks: list[TextChunk] = pickle.load(f)
    logger.info("Loaded FAISS index for %s (%d chunks)", pdf_id, len(chunks))
    return index, chunks


def build_index(api_key: str, chunks: list[TextChunk], cache_dir: Path, pdf_id: str) -> faiss.IndexFlatIP:
    texts = [c.text for c in chunks]
    logger.info("Embedding %d chunks with gemini-embedding-001 for %s", len(texts), pdf_id)
    vecs = _embed_texts(api_key, texts)
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(vecs)
    save_index(cache_dir, pdf_id, index, chunks)
    return index


def search(
    api_key: str,
    query: str,
    index: faiss.IndexFlatIP,
    chunks: list[TextChunk],
    top_k: int = 8,
) -> list[tuple[TextChunk, float]]:
    q_vec = _embed_query(api_key, query)
    scores, indices = index.search(q_vec, min(top_k, index.ntotal))
    results: list[tuple[TextChunk, float]] = []
    for score, idx in zip(scores[0], indices[0]):
        if idx != -1:
            results.append((chunks[int(idx)], float(score)))
    return results

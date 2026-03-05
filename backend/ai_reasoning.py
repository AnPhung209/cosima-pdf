from __future__ import annotations
import asyncio
import logging
from google.genai import Client
from google.genai.types import GenerateContentConfig

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-pro"
CONCURRENCY = 4


async def _reason_one(api_key: str, query: str, chunk_text: str, score: float) -> str:
    prompt = (
        f'A user highlighted this text in a PDF:\n"{query}"\n\n'
        f'The following passage scored {score:.2f} similarity:\n"{chunk_text[:400]}"\n\n'
        f"In one concise sentence, explain why this passage relates to the highlighted text. "
        f"Be specific and informative. Do not start with 'This passage'."
    )
    try:
        client = Client(api_key=api_key)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=GenerateContentConfig(max_output_tokens=2048),
            ),
        )
        text = response.text or ""
        return text.strip() if text else "Semantically related content identified in the document."
    except Exception as e:
        logger.warning("Gemini reasoning failed: %s", e)
        return "Semantically related content identified in the document."


async def generate_reasoning_batch(
    api_key: str,
    query: str,
    chunks_with_scores: list[tuple[str, float]],
) -> list[str]:
    sem = asyncio.Semaphore(CONCURRENCY)

    async def bounded(text: str, score: float) -> str:
        async with sem:
            return await _reason_one(api_key, query, text, score)

    results = await asyncio.gather(
        *[bounded(t, s) for t, s in chunks_with_scores],
        return_exceptions=True,
    )
    return [
        r if isinstance(r, str) else "Semantically related content identified in the document."
        for r in results
    ]

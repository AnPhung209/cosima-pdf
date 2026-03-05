from typing import Optional
from pydantic import BaseModel, Field, field_validator


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class RelatedChunk(BaseModel):
    id: str
    page: int
    snippet: str
    score: float
    char_start: int
    char_end: int
    bbox: BoundingBox
    reasoning: str = ""


class UploadResponse(BaseModel):
    pdf_id: str
    filename: str
    page_count: int
    chunk_count: int
    cached: bool


class RelatedTextRequest(BaseModel):
    query: str
    pdf_id: str
    top_k: int = Field(8, ge=1, le=20)

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("query must not be empty")
        return v.strip()

    @field_validator("pdf_id")
    @classmethod
    def pdf_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("pdf_id must not be empty")
        return v.strip()


class RelatedTextResponse(BaseModel):
    results: list[RelatedChunk]
    query: str
    pdf_id: str


class DeleteHighlightResponse(BaseModel):
    highlight_id: str
    deleted: bool

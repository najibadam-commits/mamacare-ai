"""HTTP routes: GET /health and POST /api/chat."""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, field_validator

router = APIRouter()


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    language: Literal["en", "ha", "pcm"] = "en"
    userStage: Optional[str] = Field(default=None, max_length=64)

    @field_validator("query")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be blank")
        return v


class Source(BaseModel):
    title: str
    category: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    disclaimer: str


@router.get("/health")
def health(request: Request) -> dict:
    return request.app.state.pipeline.health()


@router.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest, request: Request) -> ChatResponse:
    result = request.app.state.pipeline.answer(body.query, body.language, body.userStage)
    return ChatResponse(answer=result.answer, sources=result.sources, disclaimer=result.disclaimer)

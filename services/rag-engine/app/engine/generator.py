"""Answer generation: extractive by default, optional OpenAI-compatible LLM."""
from __future__ import annotations

import logging
import re
from typing import Sequence

import httpx

from app.core.config import Settings
from app.engine.ingest import _UNIT_SPLIT
from app.engine.prompts import build_messages
from app.engine.retriever import RetrievedChunk
from app.engine.text import content_stems

log = logging.getLogger("mamacare.rag.generator")

MAX_SENTENCES = 4


def format_context(chunks: Sequence[RetrievedChunk]) -> str:
    return "\n\n".join(f"[{i}] {c.title} ({c.category})\n{c.text}" for i, c in enumerate(chunks, 1))


def _sentences(chunk_text: str) -> list[tuple[str, str]]:
    """(heading, sentence) pairs; each sentence inherits the section heading above it."""
    out: list[tuple[str, str]] = []
    heading = ""
    for piece in _UNIT_SPLIT.split(chunk_text):
        piece = piece.strip()
        if not piece:
            continue
        if piece.startswith("#"):
            heading = piece.lstrip("# ").strip()
            continue
        piece = re.sub(r"^[-*]\s+", "", piece)
        if len(piece.split()) >= 4:
            out.append((heading, piece))
    return out


def extractive_answer(query: str, chunks: Sequence[RetrievedChunk]) -> tuple[str, list[RetrievedChunk]]:
    """Pick the guideline sentences that best match the question and quote them.

    Nothing is paraphrased or invented: every sentence comes straight from the verified
    corpus, which is what keeps the answer grounded. Returns the text and the chunks that
    actually contributed a sentence (these become the cited sources).
    """
    q_stems = set(content_stems(query))
    candidates: list[tuple[float, int, int, str]] = []  # (score, chunk_rank, position, text)
    seen: set[str] = set()
    for rank, chunk in enumerate(chunks):
        for pos, (heading, sentence) in enumerate(_sentences(chunk.text)):
            if sentence in seen:
                continue
            seen.add(sentence)
            own = len(q_stems & set(content_stems(sentence)))
            from_heading = len(q_stems & set(content_stems(heading)))
            if own or from_heading:
                candidates.append((own + 0.7 * from_heading - 0.1 * rank, rank, pos, sentence))
    if not candidates:
        first = [s for _, s in _sentences(chunks[0].text)[:2]] if chunks else []
        return " ".join(first), list(chunks[:1])

    best = sorted(candidates, key=lambda c: c[0], reverse=True)[:MAX_SENTENCES]
    best.sort(key=lambda c: (c[1], c[2]))  # restore reading order
    used = [chunks[r] for r in sorted({c[1] for c in best})]
    return "\n".join(f"- {c[3]}" for c in best), used


def llm_answer(settings: Settings, query: str, chunks: Sequence[RetrievedChunk], language: str, stage: str | None) -> str:
    """Call an OpenAI-compatible /chat/completions endpoint with the constrained prompt."""
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
    payload = {
        "model": settings.llm_model,
        "temperature": 0.1,
        "messages": build_messages(query, format_context(chunks), language, stage),
    }
    url = settings.llm_base_url.rstrip("/") + "/chat/completions"  # type: ignore[union-attr]
    resp = httpx.post(url, json=payload, headers=headers, timeout=settings.llm_timeout_s)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def generate(
    settings: Settings, query: str, chunks: Sequence[RetrievedChunk], language: str, stage: str | None
) -> tuple[str, list[RetrievedChunk]]:
    """Return (answer text, chunks the answer is based on)."""
    if settings.llm_enabled:
        try:
            text = llm_answer(settings, query, chunks, language, stage)
            if text:
                return text, list(chunks)
        except Exception as exc:  # network / auth / format problems -> safe extractive path
            log.warning("LLM generation failed (%s); using extractive answer", exc)
    return extractive_answer(query, chunks)

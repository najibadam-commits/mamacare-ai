"""End-to-end RAG pipeline: guard -> retrieve -> generate -> verify."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.core.config import Settings
from app.engine import generator, guardrails
from app.engine.embeddings import Embedder, build_embedder
from app.engine.ingest import get_collection, ingest_corpus
from app.engine.prompts import DANGER_ADVICE, DISCLAIMERS, FALLBACK_MESSAGE, PRESCRIPTION_REFUSAL
from app.engine.retriever import Retriever

log = logging.getLogger("mamacare.rag.pipeline")


@dataclass
class ChatResult:
    answer: str
    sources: list[dict] = field(default_factory=list)
    disclaimer: str = ""


class RagPipeline:
    def __init__(self, settings: Settings, embedder: Embedder | None = None) -> None:
        self.settings = settings
        self.embedder = embedder or build_embedder(settings)
        self.retriever = Retriever(settings, self.embedder)

    def ensure_index(self) -> dict:
        """Build the index on startup if it is missing (or always, if auto_ingest is on)."""
        status = self.retriever.index_status()
        if status["ready"] and not self.settings.auto_ingest:
            return status
        if not status["ready"] or self.settings.auto_ingest:
            ingest_corpus(self.settings, self.embedder, reset=True)
        return self.retriever.index_status()

    def health(self) -> dict:
        index = self.retriever.index_status()
        return {
            "status": "ok" if index["ready"] else "degraded",
            "service": self.settings.service_name,
            "vector_index": index,
            "generator": "llm" if self.settings.llm_enabled else "extractive",
        }

    def answer(self, query: str, language: str = "en", stage: str | None = None) -> ChatResult:
        disclaimer = DISCLAIMERS.get(language, DISCLAIMERS["en"])

        # 1. Input guardrail: never engage with prescription / dosage / diagnosis requests.
        if guardrails.is_prescription_request(query):
            return ChatResult(PRESCRIPTION_REFUSAL, [], disclaimer)

        danger = guardrails.has_danger_sign(query)

        # 2. Retrieve the top chunks (empty list = nothing relevant in the corpus).
        chunks = self.retriever.search(query, language, stage)
        if not chunks:
            answer = f"{DANGER_ADVICE}\n\n{FALLBACK_MESSAGE}" if danger else FALLBACK_MESSAGE
            return ChatResult(answer, [], disclaimer)

        # 3. Generate a grounded answer.
        text, used = generator.generate(self.settings, query, chunks, language, stage)

        # 4. Output guardrail: block any prescription-like content.
        offending = guardrails.find_forbidden_terms(text)
        if offending:
            log.warning("Output blocked by guardrail: %s", offending)
            return ChatResult(PRESCRIPTION_REFUSAL, [], disclaimer)

        if danger:
            text = f"{DANGER_ADVICE}\n\n{text}"

        seen: set[tuple[str, str]] = set()
        sources: list[dict] = []
        for c in used:
            key = (c.title, c.category)
            if key not in seen:
                seen.add(key)
                sources.append({"title": c.title, "category": c.category})
        return ChatResult(text, sources, disclaimer)

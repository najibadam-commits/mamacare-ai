"""Vector retrieval over the ChromaDB index with a relevance gate."""
from __future__ import annotations

from dataclasses import dataclass

from app.core.config import Settings
from app.engine.embeddings import Embedder
from app.engine.ingest import get_collection
from app.engine.text import content_stems, expand_query

# userStage is an optional hint; it only nudges ranking, never filters results out.
_STAGE_CATEGORIES = {
    "pregnancy": {"nutrition", "malaria"},
    "pregnant": {"nutrition", "malaria"},
    "antenatal": {"nutrition", "malaria"},
    "trimester": {"nutrition", "malaria"},
    "postnatal": {"postnatal"},
    "postpartum": {"postnatal"},
    "newborn": {"immunization", "postnatal"},
    "infant": {"immunization"},
    "baby": {"immunization"},
}
_STAGE_BOOST = 0.03


@dataclass(frozen=True)
class RetrievedChunk:
    text: str
    title: str
    category: str
    source: str
    language: str
    chunk_index: int
    score: float  # cosine similarity (1.0 = identical)


def _preferred_categories(stage: str | None) -> set[str]:
    if not stage:
        return set()
    s = stage.lower()
    for key, cats in _STAGE_CATEGORIES.items():
        if key in s:
            return cats
    return set()


class Retriever:
    def __init__(self, settings: Settings, embedder: Embedder) -> None:
        self.settings = settings
        self.embedder = embedder

    def index_status(self) -> dict:
        try:
            collection = get_collection(self.settings, create=False)
            chunks = collection.count()
            data = collection.get(include=["metadatas"])
            documents = len({m["source"] for m in data["metadatas"]}) if data["metadatas"] else 0
            return {
                "ready": chunks > 0,
                "chunks": chunks,
                "documents": documents,
                "embedding_backend": self.embedder.name,
            }
        except Exception:
            return {"ready": False, "chunks": 0, "documents": 0, "embedding_backend": self.embedder.name}

    def search(self, query: str, language: str = "en", stage: str | None = None) -> list[RetrievedChunk]:
        """Return up to ``top_k`` relevant chunks, or an empty list if nothing is on-topic."""
        s = self.settings
        try:
            collection = get_collection(s, create=False)
        except Exception:
            return []
        if collection.count() == 0:
            return []

        expanded = expand_query(query, language)
        query_stems = set(content_stems(expanded))
        if not query_stems:
            return []

        vector = self.embedder.embed([expanded])[0]
        res = collection.query(
            query_embeddings=[vector],
            n_results=min(max(s.top_k * 2, s.top_k), collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        preferred = _preferred_categories(stage)
        hits: list[RetrievedChunk] = []
        for text, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
            score = 1.0 - float(dist)
            # Relevance gate: needs real vocabulary overlap AND enough similarity.
            if not (query_stems & set(content_stems(text))):
                continue
            if score < s.min_relevance:
                continue
            if meta.get("category") in preferred:
                score += _STAGE_BOOST
            hits.append(
                RetrievedChunk(
                    text=text,
                    title=meta.get("title", ""),
                    category=meta.get("category", ""),
                    source=meta.get("source", ""),
                    language=meta.get("language", "en"),
                    chunk_index=int(meta.get("chunk_index", 0)),
                    score=score,
                )
            )
        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[: s.top_k]

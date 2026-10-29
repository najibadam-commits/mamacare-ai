"""Embedding backends.

``HashingEmbedder`` is the default: a deterministic, dependency-free "bag of hashed
word/bigram features" embedding. It needs no model download, so the whole pipeline runs
and is testable offline. It is lexical, not semantic - for real semantic search switch to
``SentenceTransformerEmbedder`` (all-MiniLM-L6-v2) via ``RAG_EMBEDDING_BACKEND``.
"""
from __future__ import annotations

import hashlib
import math
from typing import Protocol, Sequence

from app.core.config import Settings
from app.engine.text import content_stems


class Embedder(Protocol):
    name: str

    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


class HashingEmbedder:
    name = "hash"

    def __init__(self, dim: int = 384) -> None:
        self.dim = dim

    def _features(self, text: str) -> list[str]:
        stems = content_stems(text)
        feats = list(stems)
        feats.extend(f"{a}_{b}" for a, b in zip(stems, stems[1:]))
        return feats

    def _embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for feat in self._features(text):
            digest = hashlib.md5(feat.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:4], "little") % self.dim
            sign = 1.0 if digest[4] & 1 else -1.0
            weight = 0.5 if "_" in feat else 1.0  # bigrams count less than single words
            vec[idx] += sign * weight
        norm = math.sqrt(sum(v * v for v in vec))
        if norm == 0.0:
            return vec
        return [v / norm for v in vec]

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "RAG_EMBEDDING_BACKEND=sentence-transformers requires the optional "
                "'sentence-transformers' package (pip install sentence-transformers)."
            ) from exc
        self.name = f"sentence-transformers:{model_name}"
        self._model = SentenceTransformer(model_name)

    def embed(self, texts: Sequence[str]) -> list[list[float]]:  # pragma: no cover
        vectors = self._model.encode(list(texts), normalize_embeddings=True)
        return [list(map(float, v)) for v in vectors]


def build_embedder(settings: Settings) -> Embedder:
    if settings.embedding_backend == "sentence-transformers":
        return SentenceTransformerEmbedder(settings.embedding_model)
    if settings.embedding_backend == "hash":
        return HashingEmbedder(settings.embedding_dim)
    raise ValueError(f"Unknown RAG_EMBEDDING_BACKEND: {settings.embedding_backend!r}")

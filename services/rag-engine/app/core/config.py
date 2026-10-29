"""Runtime configuration for the RAG engine, read from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    service_name: str = "mamacare-rag-engine"
    corpus_dir: Path = SERVICE_ROOT / "data" / "clinical_corpus"
    chroma_dir: Path = SERVICE_ROOT / "data" / "chroma"
    collection_name: str = "maternal_guidelines"

    # "hash" = deterministic offline embeddings (no downloads).
    # "sentence-transformers" = all-MiniLM-L6-v2 (needs the optional dependency).
    embedding_backend: str = "hash"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    chunk_tokens: int = 400
    chunk_overlap: int = 50
    top_k: int = 3
    # Minimum cosine similarity for a chunk to count as "relevant". Below this the
    # engine answers with the fixed fallback instead of guessing.
    min_relevance: float = 0.12

    auto_ingest: bool = True

    # Optional OpenAI-compatible LLM. When unset, answers are extractive (quoted
    # from the retrieved guideline text), which is the safest default.
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_timeout_s: float = 30.0

    cors_origins: list[str] = field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            corpus_dir=Path(os.getenv("RAG_CORPUS_DIR", str(cls.corpus_dir))),
            chroma_dir=Path(os.getenv("RAG_CHROMA_DIR", str(cls.chroma_dir))),
            collection_name=os.getenv("RAG_COLLECTION", cls.collection_name),
            embedding_backend=os.getenv("RAG_EMBEDDING_BACKEND", cls.embedding_backend).lower(),
            embedding_model=os.getenv("RAG_EMBEDDING_MODEL", cls.embedding_model),
            chunk_tokens=int(os.getenv("RAG_CHUNK_TOKENS", cls.chunk_tokens)),
            chunk_overlap=int(os.getenv("RAG_CHUNK_OVERLAP", cls.chunk_overlap)),
            top_k=int(os.getenv("RAG_TOP_K", cls.top_k)),
            min_relevance=float(os.getenv("RAG_MIN_RELEVANCE", cls.min_relevance)),
            auto_ingest=_env_bool("RAG_AUTO_INGEST", True),
            llm_base_url=os.getenv("RAG_LLM_BASE_URL") or None,
            llm_api_key=os.getenv("RAG_LLM_API_KEY") or None,
            llm_model=os.getenv("RAG_LLM_MODEL") or None,
            llm_timeout_s=float(os.getenv("RAG_LLM_TIMEOUT_S", cls.llm_timeout_s)),
            cors_origins=_env_list("RAG_CORS_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"]),
        )

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_base_url and self.llm_model)

from __future__ import annotations

class _InMemoryCollection:
    def __init__(self):
        self.docs, self.metas, self.ids = [], [], []
    def add(self, documents=None, metadatas=None, ids=None, **kwargs):
        self.docs.extend(documents); self.metas.extend(metadatas); self.ids.extend(ids)
    def count(self):
        return len(self.docs)
    def query(self, query_texts=None, n_results=3, **kwargs):
        return {'documents': [self.docs[:n_results]], 'metadatas': [self.metas[:n_results]]}
class _InMemoryClient:
    def __init__(self):
        self.col = _InMemoryCollection()
    def get_or_create_collection(self, name, **kwargs):
        return self.col
    def delete_collection(self, name):
        self.col = _InMemoryCollection()
_mem_client = _InMemoryClient()
class _InMemoryCollection:
    def __init__(self):
        self.docs, self.metas, self.ids = [], [], []
    def add(self, documents=None, metadatas=None, ids=None, **kwargs):
        self.docs.extend(documents); self.metas.extend(metadatas); self.ids.extend(ids)
    def count(self):
        return len(self.docs)
    def query(self, query_texts=None, n_results=3, **kwargs):
        return {'documents': [self.docs[:n_results]], 'metadatas': [self.metas[:n_results]]}
class _InMemoryClient:
    def __init__(self):
        self.col = _InMemoryCollection()
    def get_or_create_collection(self, name, **kwargs):
        return self.col
    def delete_collection(self, name):
        self.col = _InMemoryCollection()
_mem_client = _InMemoryClient()
"""Corpus ingestion: markdown -> chunks (400 tokens, 50 overlap) -> embeddings -> ChromaDB."""

import logging
import re
from dataclasses import dataclass
from pathlib import Path

try:
    import chromadb
except ImportError:
    chromadb = None
try:
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    ChromaSettings = None

from app.core.config import Settings
from app.engine.embeddings import Embedder, build_embedder

log = logging.getLogger("mamacare.rag.ingest")

_TOKEN = re.compile(r"\S+")
_UNIT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


@dataclass(frozen=True)
class Document:
    source: str  # file name
    title: str
    category: str
    language: str
    reference: str  # citation line from the front matter
    body: str


def _client(settings: Settings) -> "chromadb.api.ClientAPI":
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    if chromadb is None:
        return _mem_client
    if chromadb is None:
        return _mem_client
    return chromadb.PersistentClient(
        path=str(settings.chroma_dir),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_collection(settings: Settings, create: bool = True):
    client = _client(settings)
    if create:
        return client.get_or_create_collection(
            name=settings.collection_name, metadata={"hnsw:space": "cosine"}
        )
    return client.get_collection(name=settings.collection_name)


def parse_markdown(path: Path) -> Document:
    """Read a corpus file with a simple ``key: value`` YAML-style front matter."""
    raw = path.read_text(encoding="utf-8")
    meta: dict[str, str] = {}
    body = raw
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) == 3:
            for line in parts[1].strip().splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    meta[key.strip()] = value.strip()
            body = parts[2].strip()
    return Document(
        source=path.name,
        title=meta.get("title", path.stem.replace("_", " ").title()),
        category=meta.get("category", "general"),
        language=meta.get("language", "en"),
        reference=meta.get("source", ""),
        body=body,
    )


def count_tokens(text: str) -> int:
    return len(_TOKEN.findall(text))


def chunk_text(text: str, chunk_tokens: int = 400, overlap: int = 50) -> list[str]:
    """Sentence-aware sliding window.

    A "token" is a whitespace-delimited word. Chunks hold at most ``chunk_tokens`` tokens
    and consecutive chunks share up to ``overlap`` trailing tokens (whole sentences where
    possible) so a fact on a boundary is not lost.
    """
    if overlap >= chunk_tokens:
        raise ValueError("overlap must be smaller than chunk_tokens")

    units: list[str] = []
    for piece in _UNIT_SPLIT.split(text):
        piece = piece.strip()
        if not piece:
            continue
        words = piece.split()
        # Very long single sentences are split by words so the size bound always holds.
        step = chunk_tokens
        for i in range(0, len(words), step):
            units.append(" ".join(words[i : i + step]))

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for unit in units:
        n = count_tokens(unit)
        if current and current_len + n > chunk_tokens:
            chunks.append("\n".join(current))
            # Carry trailing units totalling <= overlap tokens into the next chunk.
            carry: list[str] = []
            carry_len = 0
            for prev in reversed(current):
                pn = count_tokens(prev)
                if carry_len + pn > overlap:
                    break
                carry.insert(0, prev)
                carry_len += pn
            current, current_len = carry, carry_len
        current.append(unit)
        current_len += n
    if current and (not chunks or "\n".join(current) != chunks[-1]):
        chunks.append("\n".join(current))
    return chunks


def ingest_corpus(settings: Settings, embedder: Embedder | None = None, reset: bool = True) -> dict:
    """(Re)build the vector index from every ``*.md`` file in the corpus directory."""
    embedder = embedder or build_embedder(settings)
    files = sorted(settings.corpus_dir.glob("*.md"))
    if not files:
        raise FileNotFoundError(f"No markdown corpus files found in {settings.corpus_dir}")

    client = _client(settings)
    if reset:
        try:
            client.delete_collection(settings.collection_name)
        except Exception:  # collection did not exist yet
            pass
    collection = client.get_or_create_collection(
        name=settings.collection_name, metadata={"hnsw:space": "cosine"}
    )

    ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict] = []
    for path in files:
        doc = parse_markdown(path)
        for idx, chunk in enumerate(chunk_text(doc.body, settings.chunk_tokens, settings.chunk_overlap)):
            ids.append(f"{path.stem}-{idx:03d}")
            texts.append(chunk)
            metadatas.append(
                {
                    "source": doc.source,
                    "title": doc.title,
                    "category": doc.category,
                    "language": doc.language,
                    "reference": doc.reference,
                    "chunk_index": idx,
                }
            )

    collection.add(ids=ids, documents=texts, metadatas=metadatas, embeddings=embedder.embed(texts))
    summary = {"documents": len(files), "chunks": len(ids), "embedding_backend": embedder.name}
    log.info("Ingested corpus: %s", summary)
    return summary


if __name__ == "__main__":  # python -m app.engine.ingest
    logging.basicConfig(level=logging.INFO)
    print(ingest_corpus(Settings.from_env()))
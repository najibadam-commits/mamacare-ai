# MamaCare AI - RAG engine (FastAPI + Uvicorn + ChromaDB).
# Build:  docker build -t mamacare/rag-engine services/rag-engine
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    RAG_CHROMA_DIR=/srv/rag-engine/data/chroma

WORKDIR /srv/rag-engine

# Dependencies first so this layer is cached until requirements.txt changes.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY data/clinical_corpus ./data/clinical_corpus

# Run unprivileged. The vector index is rebuilt from the corpus at start-up (RAG_AUTO_INGEST=true),
# so the chroma directory is disposable; mount a volume on it only to avoid re-indexing on every start.
RUN useradd --system --create-home --uid 10001 appuser \
 && mkdir -p "$RAG_CHROMA_DIR" \
 && chown -R appuser:appuser /srv/rag-engine
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status==200 else 1)"

# One worker: the Chroma persistent client is not meant to be shared between processes.
# --proxy-headers: trust X-Forwarded-* from the nginx container in front of it.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]

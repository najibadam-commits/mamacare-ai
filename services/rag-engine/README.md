# MamaCare AI - RAG Engine

FastAPI microservice that answers maternal-health questions **only** from a curated clinical
corpus, and refuses to diagnose, prescribe or give dosages.

```
POST /api/chat -> input guard -> retriever (ChromaDB, top-3) -> generator -> output guard -> {answer, sources, disclaimer}
                  (dosage/diagnosis?)   (relevance gate)        (extractive|LLM)  (forbidden terms)
```

## Run

```bash
cd services/rag-engine
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest
```

The vector index is rebuilt from `data/clinical_corpus/*.md` at startup. To rebuild manually:
`python -m app.engine.ingest`.

```bash
curl localhost:8000/health
curl -X POST localhost:8000/api/chat -H "Content-Type: application/json" \
  -d '{"query":"How can I prevent malaria in pregnancy?","language":"en","userStage":"pregnancy"}'
```

## API

| Endpoint | Description |
|---|---|
| `GET /health` | `{status, service, vector_index:{ready, chunks, documents, embedding_backend}, generator}` |
| `POST /api/chat` | Body `{query, language: "en" / "ha" / "pcm", userStage?}` -> `{answer, sources:[{title, category}], disclaimer}` |

## Safety behaviour

1. **Prescription / dosage / diagnosis requests** (e.g. "What dosage of paracetamol should I take?") are refused before retrieval, with advice to see a doctor or midwife.
2. **Out-of-domain or unsupported questions** get exactly: *"I don't have verified clinical guidance on this topic. Please speak directly with a healthcare provider at your nearest health clinic."* A chunk must pass both a similarity threshold and a vocabulary-overlap check to count as relevant.
3. **Danger-sign symptoms** (bleeding, fits, severe headache, fever, ...) always get an instruction to consult a midwife or doctor, and to go to hospital / call 112 if severe.
4. **Output guard**: every answer is scanned for dose amounts (`500 mg`), "dosage", drug names and "take N tablets" patterns. A hit replaces the answer with the refusal message.

The system prompt (`app/engine/prompts.py`) encodes the same four boundaries for LLM mode.

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `RAG_EMBEDDING_BACKEND` | `hash` | `hash` (offline, lexical) or `sentence-transformers` (all-MiniLM-L6-v2) |
| `RAG_MIN_RELEVANCE` | `0.12` | Minimum cosine similarity for a chunk to be used |
| `RAG_CHROMA_DIR` / `RAG_CORPUS_DIR` | `data/chroma` / `data/clinical_corpus` | Storage and corpus locations |
| `RAG_AUTO_INGEST` | `true` | Rebuild the index on startup |
| `RAG_LLM_BASE_URL`, `RAG_LLM_MODEL`, `RAG_LLM_API_KEY` | unset | Optional OpenAI-compatible LLM; otherwise answers are extractive quotes from the corpus |
| `RAG_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

## Important limitations

- **The corpus is prototype content.** The four files summarise WHO / Nigeria FMoH / NPHCDA guidance from general knowledge and must be reviewed and signed off by clinicians (and checked against current official documents, e.g. the immunization schedule) before real use.
- **Hausa and Pidgin:** the corpus is English only. For `ha`/`pcm` queries a small glossary adds English key terms for retrieval, and answers are returned in English (the disclaimer is localised). The glossary and the draft Hausa/Pidgin disclaimers need native-speaker review.
- **Default embeddings are lexical** (hashed words), chosen so everything runs offline. They match vocabulary, not meaning; use `sentence-transformers` for real semantic search and re-tune `RAG_MIN_RELEVANCE`.
- **Guardrails are pattern-based** and can miss unusual phrasing. They are a safety net, not a clinical triage system; the web app's deterministic triage engine remains authoritative for emergencies.
- The `sentence-transformers` backend and LLM mode have not been run in the build environment; the container image has not been built there either (registry access was blocked).
- `langchain-community` is listed per the project spec but not used; only `langchain-core` prompt templating is.

## Docker

```bash
docker build -t mamacare-rag-engine .
docker run -p 8000:8000 mamacare-rag-engine
```

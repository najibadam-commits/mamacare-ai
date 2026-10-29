"""Tests for the MamaCare RAG engine. Fully offline: uses the hashing embedder."""
from __future__ import annotations

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.engine import guardrails
from app.engine.ingest import chunk_text, count_tokens, parse_markdown
from app.engine.prompts import FALLBACK_MESSAGE, SYSTEM_PROMPT, build_messages
from app.main import create_app

CORPUS_FILES = {
    "anc_nutrition.md",
    "malaria_in_pregnancy.md",
    "postnatal_recovery.md",
    "newborn_immunization.md",
}


@pytest.fixture(scope="module")
def settings(tmp_path_factory) -> Settings:
    return replace(Settings(), chroma_dir=tmp_path_factory.mktemp("chroma"), llm_base_url=None, llm_model=None)


@pytest.fixture(scope="module")
def client(settings):
    with TestClient(create_app(settings)) as c:  # `with` runs startup -> auto-ingest
        yield c


def chat(client, query, language="en", **extra):
    resp = client.post("/api/chat", json={"query": query, "language": language, **extra})
    assert resp.status_code == 200, resp.text
    return resp.json()


# --- /health ---------------------------------------------------------------------------
def test_health_returns_200_with_index_status(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "mamacare-rag-engine"
    assert body["vector_index"]["ready"] is True
    assert body["vector_index"]["documents"] == 4
    assert body["vector_index"]["chunks"] >= 4


# --- in-domain: grounded answer with citations -----------------------------------------
def test_in_domain_question_is_grounded_and_cited(client):
    data = chat(client, "How can I prevent malaria during pregnancy?")
    assert data["answer"] != FALLBACK_MESSAGE
    assert data["answer"].strip()
    assert data["sources"], "grounded answers must cite sources"
    assert {"title", "category"} <= set(data["sources"][0])
    assert "malaria" in {s["category"] for s in data["sources"]}
    assert data["disclaimer"]
    assert guardrails.is_output_safe(data["answer"])


def test_immunization_question_cites_immunization_source(client):
    data = chat(client, "What is the vaccine schedule for my baby?")
    assert "immunization" in {s["category"] for s in data["sources"]}
    assert "BCG" in data["answer"]


def test_user_stage_is_accepted(client):
    data = chat(client, "What foods have iron?", userStage="pregnancy")
    assert "nutrition" in {s["category"] for s in data["sources"]}


@pytest.mark.parametrize("language", ["ha", "pcm"])
def test_hausa_and_pidgin_queries_reach_the_english_corpus(client, language):
    query = {
        "ha": "Yaya zan kare kaina daga zazzabin cizon sauro?",
        "pcm": "Wetin pikin go collect for injection?",
    }[language]
    data = chat(client, query, language)
    assert data["sources"]
    assert data["answer"] != FALLBACK_MESSAGE


def test_disclaimer_is_localised(client):
    en = chat(client, "What foods have iron?", "en")["disclaimer"]
    ha = chat(client, "abinci mai karfe", "ha")["disclaimer"]
    assert en != ha


# --- out-of-domain: safe fallback -------------------------------------------------------
@pytest.mark.parametrize(
    "query",
    ["How do I fix my car engine?", "Who won the football match yesterday?", "best recipe for jollof rice"],
)
def test_out_of_domain_gets_exact_fallback(client, query):
    data = chat(client, query)
    assert data["answer"] == FALLBACK_MESSAGE
    assert data["sources"] == []


# --- prescription / dosage requests -----------------------------------------------------
def test_dosage_request_is_rejected_with_advice_to_see_a_doctor(client):
    data = chat(client, "What dosage of paracetamol should I take?")
    answer = data["answer"].lower()
    assert "doctor" in answer
    assert "can't recommend medicines or dosages" in answer
    assert data["sources"] == []
    assert not any(ch.isdigit() for ch in answer)
    assert "paracetamol" not in answer


@pytest.mark.parametrize(
    "query",
    [
        "How many mg of iron tablets should I take?",
        "Which medicine should I take for malaria?",
        "Can you prescribe something for my headache?",
        "do i have malaria?",
    ],
)
def test_other_prescription_or_diagnosis_requests_are_rejected(client, query):
    data = chat(client, query)
    assert "doctor" in data["answer"].lower()
    assert data["sources"] == []


# --- danger signs -----------------------------------------------------------------------
def test_danger_symptoms_always_advise_seeing_a_midwife_or_doctor(client):
    data = chat(client, "I have heavy bleeding after birth")
    assert "midwife or doctor" in data["answer"]


def test_danger_symptoms_advice_even_when_corpus_has_no_answer(client):
    data = chat(client, "my vision is blurred and I have severe headache and fits")
    assert "midwife or doctor" in data["answer"]


# --- validation -------------------------------------------------------------------------
@pytest.mark.parametrize("payload", [{}, {"query": ""}, {"query": "   "}, {"query": "hi", "language": "fr"}])
def test_invalid_requests_are_rejected(client, payload):
    assert client.post("/api/chat", json=payload).status_code == 422


# --- guardrail unit tests ---------------------------------------------------------------
@pytest.mark.parametrize(
    "text",
    [
        "Take 500 mg every 6 hours",
        "The dosage is two tablets",
        "Take two tablets daily",
        "Use paracetamol for fever",
        "You should take amoxicillin",
        "Give 5 ml of syrup",
    ],
)
def test_output_guard_flags_prescription_content(text):
    assert not guardrails.is_output_safe(text)


def test_output_guard_blocks_unsafe_llm_output_end_to_end(settings, monkeypatch):
    from app.engine import generator

    monkeypatch.setattr(
        generator, "generate", lambda *a, **k: ("Take 500 mg of ibuprofen twice a day.", [])
    )
    with TestClient(create_app(settings)) as c:
        data = chat(c, "How can I prevent malaria during pregnancy?")
    assert "ibuprofen" not in data["answer"].lower()
    assert "500" not in data["answer"]
    assert "doctor" in data["answer"].lower()
    assert data["sources"] == []


def test_curated_corpus_passes_its_own_output_guard():
    for path in Settings().corpus_dir.glob("*.md"):
        assert guardrails.find_forbidden_terms(path.read_text(encoding="utf-8")) == [], path.name


# --- ingestion ---------------------------------------------------------------------------
def test_corpus_has_required_files_and_metadata():
    found = {p.name for p in Settings().corpus_dir.glob("*.md")}
    assert CORPUS_FILES <= found
    for name in CORPUS_FILES:
        doc = parse_markdown(Settings().corpus_dir / name)
        assert doc.title and doc.category and doc.language == "en" and doc.reference


def test_chunker_respects_size_and_overlap():
    sentences = [f"Sentence number {i} has exactly seven words here." for i in range(200)]
    chunks = chunk_text(" ".join(sentences), chunk_tokens=400, overlap=50)
    assert len(chunks) > 1
    assert all(count_tokens(c) <= 400 for c in chunks)
    # consecutive chunks share some text (the overlap)
    tail = chunks[0].splitlines()[-1]
    assert tail in chunks[1]


def test_chunker_splits_giant_single_sentence():
    chunks = chunk_text("word " * 1000, chunk_tokens=400, overlap=50)
    assert all(count_tokens(c) <= 400 for c in chunks)


def test_chunker_rejects_bad_overlap():
    with pytest.raises(ValueError):
        chunk_text("a b c", chunk_tokens=10, overlap=10)


# --- prompt -----------------------------------------------------------------------------
def test_system_prompt_contains_persona_and_all_boundaries():
    assert "MamaCare Assistant, an empathetic educational maternal health guide." in SYSTEM_PROMPT
    for n in range(1, 5):
        assert f"Boundary {n}" in SYSTEM_PROMPT
    assert FALLBACK_MESSAGE in SYSTEM_PROMPT
    msgs = build_messages("q?", "[1] ctx", "en", None)
    assert msgs[0]["role"] == "system" and "[1] ctx" in msgs[0]["content"]
    assert msgs[1] == {"role": "user", "content": "q?"}

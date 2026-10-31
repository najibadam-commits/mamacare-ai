# Changelog

## v0.1.0 - 2026-10-31 (pilot candidate)

First tagged release.

- Offline-first PWA (English, Hausa, Nigerian Pidgin): stage-based guides, appointments with discreet on-device reminders, facility directory
- Deterministic danger-sign triage that runs before any network call; emergency alert with 112 and a saved contact
- RAG assistant (FastAPI + ChromaDB) with input/output guardrails and an offline FAQ fallback; text-to-speech
- NDPA-aligned privacy controls: export, delete-all, storage audit, AES-GCM field encryption, strict CSP; first-use notice that chat questions are sent to the server
- Zero-PII DHIS2 `DataValueSet` connector package
- Docker Compose deployment (nginx + RAG engine), Playwright end-to-end journeys, CI, GitHub Pages demo
- Governance and compliance docs: SAFETY, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, ROADMAP, DPG checklist (self-assessed), draft DPIA and safeguarding statement

Known limitations: clinical content and Hausa/Pidgin translations are unreviewed prototypes; default RAG answers are extractive; numeric blood-pressure triage, on-device models and SQLite offline storage are roadmap items, not implemented.

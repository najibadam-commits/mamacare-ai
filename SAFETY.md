# Clinical safety and ethical AI protocol

This document states what MamaCare AI does to keep users safe, and where it falls short. Claims are limited to what is implemented in this repository; planned items are labelled **Planned**.

## 1. Scope and boundaries

- **Assistive information only.** MamaCare AI is not a medical device, does not diagnose, prescribe or give dosages, and does not replace a midwife, doctor or Community Health Worker (CHW).
- **Human in the loop.** Every emergency path ends in a person: tap-to-call 112, a saved personal contact, and a facility finder. The assistant tells users to see a provider for any danger sign.
- **Population:** pregnancy and the postnatal period. Content outside this scope is answered with a fixed "no verified guidance" message.
- **Unreviewed content.** The guides, clinical corpus, triage phrase lists and Hausa/Pidgin translations are prototypes. They must be reviewed and signed off by clinicians and native-speaker health workers before real-world use (see [docs/PILOT.md](docs/PILOT.md)).
- **Review status.** Clinical and language review is in progress; what has and has not been signed off is recorded in [docs/CLINICAL_REVIEW.md](docs/CLINICAL_REVIEW.md), with a printable [triage review sheet](docs/clinical-review/TRIAGE_REVIEW_SHEET.md).

## 2. Deterministic red-flag triage (no generative AI)

`apps/web-pwa/src/services/triage.ts` (`evaluateSymptoms`) is a rule engine. It runs on every chat message **before any network call or model**, so emergencies never depend on a generated answer and never leave the device. Same input, same output.

| Danger sign | Rule id |
|---|---|
| Heavy bleeding (antepartum and postpartum haemorrhage) | `severe_bleeding` |
| Severe headache / blurred vision (possible pre-eclampsia) | `pre_eclampsia` |
| Fits / convulsions | `convulsions` |
| Waters breaking | `waters_broke` |
| Reduced fetal movement | `reduced_fetal_movement` |
| High fever / chills | `fever_malaria` |
| Postpartum severe pain / foul discharge | `postpartum_complication` |

Phrases are matched in English, Hausa and Nigerian Pidgin regardless of UI language. Negation is deliberately **not** filtered ("I am not bleeding" still alerts): the engine is fail-safe. A match opens a full-screen emergency alert and posts an urgent referral message; the request is not sent to the backend (verified by an end-to-end test).

**Not implemented:** numeric blood-pressure thresholds (e.g. 140/90) and obstructed-labour detection. The app does not collect measurements; these are **Planned** and would need clinical design.

## 3. Grounding and hallucination controls (RAG engine)

`services/rag-engine` answers only from a curated corpus:

1. **Input guard** refuses dosage, prescription and diagnosis requests before retrieval.
2. **Relevance gate:** a chunk must pass a similarity threshold and a vocabulary-overlap check; otherwise a fixed safe message is returned.
3. **Default generation is extractive** (quotes from the corpus; no model). If an optional LLM is configured, it runs at `temperature = 0.1` with a prompt restricted to retrieved context.
4. **Output guard** blocks dose amounts, drug names and "take N tablets" patterns, replacing the answer with the refusal message.
5. Danger-sign wording always adds an instruction to contact a provider or go to hospital / call 112.

Limits: the guards are pattern-based and can miss unusual phrasing. The corpus is English only and **not yet** limited to, or verified against, current WHO antenatal care documents - that review is required. Answers carry source titles so reviewers can audit them.

## 4. Privacy and data protection

- **Local-first:** appointments, preferences and notes live in the user's IndexedDB. No accounts. No analytics, ads or third-party scripts (enforced by CSP).
- Appointment notes and the emergency contact number are AES-GCM encrypted at rest with a non-extractable key. Titles and facility names are not.
- Reminders are generated on the device; discreet mode shows no clinical wording.
- **Export** and **Delete All My Data** are in Settings (NDPA-aligned).
- Chat history is in memory only. Server access logs contain IP addresses; set short retention (see [docs/PILOT.md](docs/PILOT.md)).
- **DHIS2 connector** sends aggregate counts only, with a strict allow-list that rejects free text.
- An external LLM, if enabled, sends the user's question text to that provider. It is **off by default**.

## 5. Incident reporting and review

Report safety concerns or suspected harm privately via [SECURITY.md](SECURITY.md). Any clinical-content defect found in a pilot should be treated as a safety incident: pause the affected content, document it, and have a named clinician approve the fix.

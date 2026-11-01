# Digital Public Good (DPG) self-assessment

Maps MamaCare AI against the nine indicators of the [Digital Public Goods Standard](https://digitalpublicgoods.net/standard/) (v1.1.x).

> **This is a self-assessment, not a certification.** Only the DPG Alliance can recognise a product as a DPG, after its own review. Statuses: **Met** = evidence exists in this repository; **Partial** = work remains; **Open** = needs an owner decision or external action. Verify the indicator wording against the current standard before submitting.

| # | Indicator | Status | Evidence / gaps |
|---|---|---|---|
| 1 | **Relevance to the SDGs** | Met | Targets SDG 3 (good health and well-being), esp. 3.1 (maternal mortality) and 3.7/3.8 (access to reproductive and primary care), and SDG 10 via Hausa and Pidgin access. See README. |
| 2 | **Use of approved open licenses** | Met | Source: Apache-2.0 ([LICENSE](LICENSE)). Production dependencies are MIT, ISC or Apache-2.0 (checked with `pnpm licenses list --prod`; re-run for Python with `pip-licenses` before each release). Clinical corpus and guide text are prototype content authored for this project and covered by the same licence; replace/relicense (e.g. CC BY-SA 4.0) if you adopt third-party text. |
| 3 | **Clear ownership** | Open | Name the legal owner/steward in this file and in `LICENSE` copyright line before submission: _Owner: TBD (eHealth Africa / project steward)_. |
| 4 | **Platform independence** | Met | No proprietary runtime dependency. Everything runs in Docker or directly on Node and Python. The LLM is optional and any OpenAI-compatible endpoint (including self-hosted) can be used; the default answers are extractive and need no external service. No third-party scripts, fonts, analytics or CDNs (enforced by CSP). |
| 5 | **Documentation** | Partial | [README](README.md), [docs/PILOT.md](docs/PILOT.md), [services/rag-engine/README.md](services/rag-engine/README.md), [packages/dhis2-connector/README.md](packages/dhis2-connector/README.md), [CONTRIBUTING.md](CONTRIBUTING.md). Gap: no end-user manual or hosted demo; Hausa/Pidgin docs not written. |
| 6 | **Mechanism for extracting data** | Met | In-app **Export My Data** (JSON); DHIS2 `DataValueSet` export; no proprietary formats. |
| 7 | **Adherence to privacy and applicable laws** | Partial | Privacy by design: local-first storage, no accounts, no analytics, consent before notifications, AES-GCM at-rest encryption of notes/emergency contact, one-tap erasure, strict CSP, zero-PII DHIS2 allow-list. A draft DPIA is in [docs/DPIA.md](docs/DPIA.md) (needs controller sign-off). Gaps: NDPA registration/legal review and a published privacy notice are the deployer's job (see PILOT.md). Appointment titles and facility names are not encrypted. |
| 8 | **Adherence to standards and best practices** | Partial | Open standards: DHIS2 Web API, WCAG-minded semantic UI, PWA/Web Manifest, OpenAPI (FastAPI `/docs`), Dockerfile/OCI. Gaps: no formal accessibility audit; no HL7 FHIR interface; clinical content not yet reviewed against current FMoH/WHO documents. |
| 9a | **Do No Harm: data privacy and security** | Partial | See #7, [SECURITY.md](SECURITY.md). Gap: no independent security review or penetration test. |
| 9b | **Do No Harm: inappropriate and illegal content** | Met | Closed-corpus RAG (no user-generated content hosted); output guard blocks dosage/diagnosis. |
| 9c | **Do No Harm: protection from harassment / safeguarding** | Partial | No social features, no user-to-user messaging, no accounts or children's data collection. UNICEF-aligned: data minimisation, no profiling, no ads. A draft safeguarding statement is in [docs/SAFEGUARDING.md](docs/SAFEGUARDING.md); a named focal person still needs to be appointed. Adolescent users' content needs review. |

## Clinical safety (not a DPG indicator, but a release blocker)

- Deterministic triage runs before any network call and is unit-tested in three languages.
- All clinical text, phrase lists and translations are **unreviewed prototypes** until signed off; the process, scope and log are in [docs/CLINICAL_REVIEW.md](docs/CLINICAL_REVIEW.md). Clinician and native-speaker sign-off is mandatory before real use.

## Outstanding actions before applying

1. Name the owner (indicator 3).
2. Clinical and linguistic review; publish reviewers.
3. Accessibility audit; security review.
4. Run a real pilot and DPIA; add a hosted demo and end-user guide.

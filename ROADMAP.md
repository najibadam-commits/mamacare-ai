# MamaCare AI Technical Roadmap (12-Month Grant Plan)

This roadmap tracks our **planned** engineering and clinical validation milestones under the UNICEF Venture Fund lifecycle. Nothing below is implemented yet unless stated in [README.md](README.md) or [SAFETY.md](SAFETY.md); dates and scope may change after clinical review and pilot learning. Progress is tracked with GitHub issues.

## Quarter 1: Clinical Matrix Hardening & Numerical Triage
- [ ] M1: Implement numeric blood pressure extraction and threshold rules (>= 140/90 mmHg) for severe pre-eclampsia.
- [ ] M2: Complete WHO Antenatal Care (ANC) and IMPAC guideline corpus indexing and clinical matrix verification.
- [ ] M3: Multilingual prompt and tokenizer integration for Hausa and Swahili.

## Quarter 2: Edge Quantization & Offline Android Runtime
- [ ] M4: Implement ONNX Runtime export with 4-bit and 8-bit integer post-training quantization (PTQ).
- [ ] M5: Build in-process embedded SQLite vector storage for 100% offline edge execution.
- [ ] M6: Package lightweight Android APK wrapper (<85MB) targeting ARM64 commodity hardware (<2GB RAM).

## Quarter 3: Primary Healthcare Feasibility Pilot & Surveillance
- [ ] M7: Implement automated local PII-stripping and data sanitization filter.
- [ ] M8: Develop `cli.py` non-PII open metrics exporter for aggregated epidemiological indicators (DPG Indicator 6).
- [ ] M9: Conduct 10-clinic primary health center (PHC) observational pilot with frontline health workers.

## Quarter 4: National Interoperability & DPGA Certification
- [ ] M10: Build native DHIS2 `/api/dataValueSets` store-and-forward synchronizer.
- [ ] M11: Map longitudinal maternal tracking data to HL7 FHIR Observation and RiskAssessment profiles.
- [ ] M12: Complete formal application for Digital Public Goods Alliance (DPGA) registry listing.

## Already in place (baseline)

Offline-first PWA, English/Hausa/Pidgin UI, deterministic keyword triage, RAG assistant over a prototype corpus, NDPA privacy controls, a zero-PII DHIS2 `DataValueSet` builder (no synchronizer yet), Docker deployment and Playwright journeys. See [DPG_CHECKLIST.md](DPG_CHECKLIST.md) for open gaps.

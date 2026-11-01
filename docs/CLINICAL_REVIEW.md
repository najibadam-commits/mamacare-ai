# Clinical and language review record

**Status: in progress.** Face-to-face review discussions with health workers at primary health centres are under way. **No completed sign-off is recorded in this repository yet.** Until the log below has signed entries covering an item, treat that item as an unreviewed prototype (see [SAFETY.md](../SAFETY.md)).

## What must be reviewed

| # | Item | Where it lives | Reviewer type |
|---|---|---|---|
| 1 | Danger-sign rules, advice text and trigger phrases (EN/HA/PCM) | `apps/web-pwa/src/services/triage.ts`; printable sheet: [TRIAGE_REVIEW_SHEET.md](clinical-review/TRIAGE_REVIEW_SHEET.md) | Doctor or midwife, plus native-speaker health worker |
| 2 | Clinical corpus used by the assistant (4 files) | `services/rag-engine/data/clinical_corpus/` | Doctor or midwife; check against current FMoH / NPHCDA / WHO documents |
| 3 | Seeded guides, 6 guides x 3 languages | `apps/web-pwa/src/data/guides.seed.ts` | Midwife or CHEW, plus native-speaker translator |
| 4 | Offline FAQ answers | `apps/web-pwa/src/services/offlineFaq.ts` | Midwife or CHEW |
| 5 | Hausa and Pidgin interface text and the Hausa/Pidgin glossary | `apps/web-pwa/src/i18n/strings.ts`; `services/rag-engine/app/engine/` | Native-speaker health worker |
| 6 | Facility directory data (currently sample data) | `apps/web-pwa/src/services/facilitiesData.ts` | Local health officer; verify phone numbers and services |
| 7 | Immunisation schedule statements | corpus and guides | Immunisation officer; check the current national schedule |

## How a review is done

1. Record the exact version reviewed (the git commit or release tag, for example `v0.1.0`).
2. Reviewers mark each item OK, CHANGE (with the correction) or REMOVE. For item 1, use the printable triage sheet and keep the signed copy.
3. Every accepted change goes in through a pull request from a `clinical-validation/` branch that cites the source guideline and version (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
4. After changes, re-run `pnpm test` and regenerate the sheets: `node scripts/export-review-pack.mjs review.json` (readable markdown copy plus data), then `python3 scripts/build-review-pack.py review.json MamaCare_AI_triage_review_sheet.docx v0.1.0` (printable Word pack, needs `pip install python-docx`).
5. Add a row to the log below. Reviewers' names are recorded only with their consent; otherwise record role and facility.
6. Keep signed paper or scanned copies outside the public repository. Never include patient information.

## Review log

| Date | Item(s) | Version reviewed | Reviewer (name or role) | Qualification | Facility / location | Outcome | Changes made (PR or commit) | Signed copy held |
|---|---|---|---|---|---|---|---|---|
| _EXAMPLE, delete when real rows are added:_ 2026-11-02 | 1 | v0.1.0 | Midwife (name withheld) | Registered midwife | Example PHC, Kano | CHANGE: 3 phrases | PR #00 | Yes |

## Sign-off rule

An item counts as clinically reviewed only when (a) a qualified clinician has signed it, (b) for translated text, a native-speaker health worker has also signed it, and (c) every requested change has been merged or explicitly declined with a reason. Public statements about review (README, funding applications) must match this log.

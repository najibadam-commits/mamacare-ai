# Clinical and language review record

**Status: first round of item 1 collected; review still in progress.** Between 4 and 8 November 2026, six frontline health workers at five facilities in three states (Kano, Katsina and Adamawa) reviewed the danger-sign alert wording (item 1, version v0.1.0) on printed sheets. Most marked every alert OK. One wording correction was accepted and applied; several suggestions and some unexplained cross-outs are still open (see the log). This is **not** a completed sign-off or a clinical validation: under the sign-off rule below, item 1 stays "review in progress" until the open points are resolved, and items 2 to 7 (guides, assistant corpus, offline FAQ, Hausa/Pidgin interface text, facility data, immunisation statements) have **not** yet been reviewed. Treat anything not covered by a signed entry as an unreviewed prototype (see [SAFETY.md](../SAFETY.md)).

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
7. Facilities that take part may also be listed in the app's directory, but only with the facility's written permission and only with details someone at the facility has confirmed. Use the one-page form built by `python3 scripts/build-facility-form.py`. Being listed or named is not an endorsement or partnership, and the wording in any public document must say so.

## Review log

| Date | Item(s) | Version reviewed | Reviewer (name or role) | Qualification | Facility / location | Outcome | Changes made (PR or commit) | Signed copy held |
|---|---|---|---|---|---|---|---|---|
| 2026-11-04 | 1 (EN) | v0.1.0 | Saifullahi Ibrahim (consented) | CHEW, second in charge | Kadawa Gate PHC, Garun Mallam LGA, Kano | Reviewed in **English** (only language declared). OK on all 7 alerts. Suggested additions, not applied: "dizziness" (bleeding); "crying", "yellow eye", "cyanosis / blue skin" (newborn signs, not covered by the current 7); "weakness", "joint pain" (fever). A few English trigger phrases are marked with an X (for example "soak...", "blood from...", "blood (in / on)...", "severe malaria") with no explanation. One Pidgin "Change" box ticked without text (waters breaking). | None yet; suggestions need a second reviewer | Yes |
| 2026-11-05 | 1 (HA) | v0.1.0 | Reviewer name not published | Officer in charge, BSc Community Health | Bara PHC, Rogo LGA, Kano | Reviewed in **Hausa** only. OK on the Hausa advice for all 7 alerts; "No corrections" written. Several Hausa trigger phrases are struck through (bleeding: 5 phrases; severe headache: the swelling and high-blood-pressure "weaker" phrases; fever: one phrase), which conflicts with "No corrections". | None; no phrase removed. Follow up with the reviewer. Missing a danger sign is worse than a false alarm | Yes |
| 2026-11-05 | 1 (EN) | v0.1.0 | Reviewer name not published | CHEW, in charge | CHC Mashi, Katsina State | Marked OK on all alerts, "all correct, no corrections". Declared English (Pidgin mark unclear), not Hausa. Only the English review is counted. | None needed | Yes |
| 2026-11-05 | 1 (EN, HA) | v0.1.0 | Reviewer name not published | CHEW, in charge | A health centre in Adamawa State (facility name withheld: no permission recorded) | Reviewed in **English and Hausa**. OK on all alerts, "all the words are correct". | None needed | Yes |
| 2026-11-07 | 1 (EN, PCM) | v0.1.0 | Reviewer name withheld at reviewer's request | Midwife | CHC Matazu, Katsina State | OK on all alerts except one **CHANGE**: in English use "abdominal pain" instead of "belly pain" (postpartum alert). | Applied: English title and advice of the postpartum alert now say "abdominal pain" (branch clinical-validation/first-round-review). "belly" remains an accepted trigger word. | Yes |
| 2026-11-08 | 1 (EN, HA, PCM) | v0.1.0 | Nafisa Garba (consented) | Community Health Officer, in charge | CHC Matazu, Katsina State | OK on the alerts reviewed; no corrections written. Some pages were scanned sideways and a few tick marks are hard to read. | None needed | Yes |

### Open points from the first round

1. **Suggested additions** (Kadawa Gate PHC): "dizziness" with bleeding; newborn danger signs (crying, yellow eye, blue skin); "weakness" and "joint pain" with fever. These are not applied because "dizziness", "weakness" and "joint pain" alone are common and non-specific, and the newborn signs are outside the current seven alerts. Each needs a second clinician's view before any change.
2. **Struck-through phrases** (Kadawa Gate PHC English; Bara PHC Hausa): the meaning is unclear, since the reviewers also wrote "no corrections". No phrase has been removed. The app deliberately over-alerts rather than under-alerts, so a phrase is removed only after the reviewer confirms it is wrong.
3. **Language scope:** only the languages a reviewer declared are counted (Kadawa Gate: English; Bara: Hausa; Mashi: English; Adamawa centre: English and Hausa; Matazu: midwife English and Pidgin, CHO English, Hausa and Pidgin). Pidgin therefore has limited review so far.
4. **Not yet reviewed:** items 2 to 7.

## Sign-off rule

An item counts as clinically reviewed only when (a) a qualified clinician has signed it, (b) for translated text, a native-speaker health worker has also signed it, and (c) every requested change has been merged or explicitly declined with a reason. Public statements about review (README, funding applications) must match this log.

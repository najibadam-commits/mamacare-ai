# Contributing to MamaCare AI

Thank you for helping. This project serves pregnant and postnatal women and frontline health workers, so safety and privacy come before speed. By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Who can contribute

- **Developers:** features, fixes, tests, accessibility, performance on low-end Android devices.
- **Community health volunteers and health workers:** usability feedback, missing local phrases, facility data corrections. You do not need to write code; open an issue.
- **Clinical reviewers (doctors, midwives, nurses):** review of guides, the RAG corpus, triage phrase lists and Hausa/Pidgin text. Reviews are recorded in pull requests.

## Fork and branch workflow

1. Fork the repository and clone your fork.
2. Create a branch from `main` with the right prefix:
   - `feature/<short-name>` - new functionality
   - `fix/<short-name>` - bug fixes
   - `clinical-validation/<short-name>` - changes to clinical content, triage rules, corpus or translations
3. Make focused commits with clear messages (for example `fix: handle Hausa hooked letters in triage`).
4. Open a pull request against `main` describing what changed and why.

`clinical-validation/` pull requests must cite the source (WHO, FMoH, NPHCDA, or a named guideline and version), say who reviewed it and in what capacity, and be reviewed by a clinician before merging. Never post real patient or user data.

## Setup

```bash
corepack enable
pnpm install
pnpm --filter web-pwa e2e:install        # one-off: Chromium for Playwright
cd services/rag-engine && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt   # Windows: .venv\Scripts\activate
```

## Testing: all existing tests must pass before you open a pull request

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm e2e                                  # browser journeys
(cd services/rag-engine && pytest)        # RAG engine
node scripts/verify-pilot.mjs --skip-rag  # size budget, DHIS2 conformance
```

Add or update tests with every behaviour change. Pull requests with failing tests will not be merged.

## Ground rules

- **Safety first.** Triage stays deterministic and runs before any network call. Never add dosing, diagnosis or prescribing behaviour.
- **Privacy.** No analytics, trackers, third-party origins, or personal data in logs, exports or DHIS2 payloads. Encrypt new stored fields that hold personal text (`apps/web-pwa/src/services/crypto.ts`).
- Keep the PWA under 5 MB.
- By contributing you agree your work is licensed under Apache-2.0.

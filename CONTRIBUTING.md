# Contributing to MamaCare AI

Thank you for helping. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first.

## Setup

```bash
corepack enable
pnpm install
pnpm --filter web-pwa e2e:install        # one-off: Chromium for Playwright
cd services/rag-engine && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt   # Windows: .venv\Scripts\activate
```

## Before opening a pull request

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm e2e                                  # browser journeys
node scripts/verify-pilot.mjs --skip-rag  # size budget, DHIS2 conformance
(cd services/rag-engine && pytest)
```

## Ground rules

- **Safety first.** Triage stays deterministic and runs before any network call. Never add dosing, diagnosis or prescribing behaviour.
- **Privacy.** No analytics, trackers, third-party origins or PII in logs, exports or DHIS2 payloads. New stored fields holding personal text should be encrypted (`apps/web-pwa/src/services/crypto.ts`).
- **Clinical or translated text** changes must name a source and be flagged for clinician/native-speaker review in the PR.
- Add tests with every behaviour change. Keep the PWA under 5 MB.
- Use small PRs and descriptive commit messages. By contributing you agree your work is licensed under Apache-2.0.

Report vulnerabilities privately - see [SECURITY.md](SECURITY.md).

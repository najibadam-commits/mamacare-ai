<p align="center"><img src="docs/assets/logo.png" alt="MamaCare AI - Bridging Maternal & Newborn Care" width="360"></p>

# MamaCare AI

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![DPG Standard: self-assessed](https://img.shields.io/badge/DPG_Standard-self--assessed-orange.svg)](DPG_CHECKLIST.md)
[![SDG 3: Good Health](https://img.shields.io/badge/SDG_3-Good_Health-4C9F38.svg)](DPG_CHECKLIST.md)
[![SDG 5: Gender Equality](https://img.shields.io/badge/SDG_5-Gender_Equality-FF3A21.svg)](DPG_CHECKLIST.md)

A mobile-first maternal health platform for Nigeria. MamaCare AI gives expectant and new mothers trusted health guides, appointment tracking, an AI assistant, and a directory of nearby healthcare facilities, in **English, Hausa and Nigerian Pidgin**.

> Status: **pilot candidate (v0.1.0)** - offline-first PWA, multilingual UI, guides, appointments with private reminders, deterministic triage, facility directory, RAG assistant, NDPA privacy controls, DHIS2 connector, Docker deployment and end-to-end tests. Clinical content and translations are **unreviewed prototypes**: see [docs/PILOT.md](docs/PILOT.md) before any real-world use. DPG self-assessment: [DPG_CHECKLIST.md](DPG_CHECKLIST.md). Privacy and safeguarding drafts: [docs/DPIA.md](docs/DPIA.md), [docs/SAFEGUARDING.md](docs/SAFEGUARDING.md).

## Executive summary

MamaCare AI is open-source, offline-first maternal health support for pregnant and postnatal women and the frontline health workers who help them in low-connectivity settings. Emergency detection is deterministic and runs on the device; the optional assistant answers only from a curated corpus. See [SAFETY.md](SAFETY.md) for the clinical safety protocol and [DPG_CHECKLIST.md](DPG_CHECKLIST.md) for the (self-assessed) Digital Public Goods mapping.

**Live demo:** https://najibadam-commits.github.io/mamacare-ai/ (static build on GitHub Pages; the AI assistant is not hosted there, so it shows its offline-library fallback).

**Roadmap:** the 12-month plan is in [ROADMAP.md](ROADMAP.md).

**Request flow:** `Deterministic emergency rule engine (on device)` -> `RAG engine: input guard -> retrieval over the clinical corpus -> extractive (or optional LLM) answer -> output guard` -> `offline FAQ fallback if the backend is unreachable`.

**Not built (do not assume):** quantized on-device language models, ONNX runtime inference, SQLite storage, or an automated PII-stripping pipeline. The RAG engine stores no user data; the web app keeps data in IndexedDB.

**Data extraction (DPG indicator 6):** users can export their own data as JSON (Settings), and `packages/dhis2-connector` produces zero-PII aggregate DHIS2 `DataValueSet` payloads. There is no CSV export CLI.

## Features

- Mobile-first, installable PWA (React 18 + Vite + TypeScript + Tailwind CSS)
- **Offline-first:** Workbox service worker (via `vite-plugin-pwa`) precaches the app shell, icons and static assets (~360 KiB); guides live in IndexedDB (Dexie)
- **Multilingual:** English, Hausa and Nigerian Pidgin; switching language in the header updates UI text and guide content instantly, and the choice is remembered
- **Stage-based guides:** First / Second / Third Trimester, Postnatal Care and Baby Care, with an article reader (key takeaways, scannable cards, urgent warning banner) and read tracking
- **Appointments manager:** antenatal / postnatal / immunisation / general visits stored in IndexedDB (works fully offline), with Upcoming and Past tabs, colour-coded badges, add / edit / mark completed / delete (with confirmations) and an encouraging empty state
- **Consent-driven, local-only reminders (NDPA-aligned):** a plain-language consent sheet appears before the browser permission prompt; reminders are generated on-device (no server, no push service, no analytics); one-tap revoke
- **Discreet Reminders (on by default):** lock-screen text is only "Reminder: You have a health visit scheduled for tomorrow at 10:00 AM" - never the title, facility, notes, visit type or any pregnancy hint, and no app icon. Turn it off to show the full title and facility name
- **Deterministic triage interceptor** (`services/triage.ts`): rule-based scan of English, Hausa and Nigerian Pidgin text for 7 danger-sign categories (heavy bleeding, severe headache / blurred vision, fits, waters breaking, reduced fetal movement, high fever / chills, postpartum severe pain / foul discharge). No ML, no network: same input, same output. Emergencies and urgent signs open a high-contrast emergency modal (Tap-to-Call 112, a saved personal emergency contact, "Find Nearest Facility") that states MamaCare AI is educational only
- **Facility directory:** filter chips (All / Emergency Obstetric Care / PHC / General Hospitals), search by name or LGA, services tags, Call and Directions buttons, and an optional "Sort by nearest" that asks first and keeps your location only in memory on the device
- Header with emergency (SOS) button; bottom navigation for Home, Guides, Appointments, AI Assistant, Healthcare Directory
- Offline banner when the device loses connectivity

### Triage design notes

- Every call scans **all three languages** whatever the UI language is (people code-switch); the language argument only picks the language of the returned labels and advice.
- Text is normalised (case, accents, Hausa hooked letters, apostrophes, punctuation), phrases support `(a|b)` alternatives and `word*` prefixes, and negations are **not** filtered ("I am not bleeding" still alerts) - the engine is deliberately fail-safe.
- Unit tests (`pnpm --filter web-pwa test`) run every phrase of every rule in every language, plus the spec examples and benign-text checks. Phrase lists must be reviewed by clinicians and native-speaker health workers before release.

### Directory data status

`services/facilitiesData.ts` is **sample data**: no phone numbers or verification dates are filled in, so the UI shows "Not yet verified" and "No phone number on file". Replace it with Federal Ministry of Health Health Facility Registry (https://hfr.health.gov.ng) or state records, and set `phone` / `verifiedDate` only for confirmed entries - the Call button and the "Verified <date>" badge appear automatically.

### How reminders work (and their limits)

There is deliberately no backend, so reminders cannot be pushed to a fully closed app. A small in-app scheduler checks every ~20 seconds (and on focus / reconnect) while MamaCare is open, including in a background tab, and shows any reminder that is due, exactly once. If the app was closed at the due time, the reminder appears the next time it is opened (as long as the visit has not started). Revoking consent clears all pending reminder state; browsers do not let sites remove their own permission, so users are told to use browser site settings to remove it fully. Some phones show the app name on the lock screen even in discreet mode.

### Content notice

The 6 seeded guides (x 3 languages) in `apps/web-pwa/src/data/guides.seed.ts` are **mock content** summarising commonly published WHO / NPHCDA guidance. They must be reviewed by qualified clinicians and native-speaker health translators (especially Hausa and Pidgin) before any real-world use.

## Architecture

```mermaid
flowchart TD
    User([Mother / Caregiver]) --> PWA

    subgraph PWA["apps/web-pwa (runs on the phone, works offline)"]
        Shell["App shell<br/>Header + Bottom Nav"]
        Shell --> Home[Home]
        Shell --> Guides[Guides viewer]
        Shell --> Appts[Appointments]
        Shell --> AI[AI Assistant]
        Shell --> Dir[Healthcare Directory]
        Triage["Deterministic triage<br/>(runs first, on device)"]
        AI --> Triage
        SW["Service worker (Workbox)<br/>precached app shell"]
        I18N["i18n provider<br/>EN / HA / PCM"]
        IDB[("IndexedDB via Dexie<br/>guides, appointments, preferences<br/>notes encrypted (AES-GCM)")]
        Guides --> IDB
        Appts --> IDB
        Shell --> I18N
        PWA --- SW
    end

    Triage -- "no danger sign + online" --> Proxy["nginx: /api proxy<br/>CSP + security headers"]
    Proxy --> RAG["services/rag-engine<br/>FastAPI + ChromaDB<br/>input guard, retrieval, output guard"]
    RAG -.-> LLM["Optional external LLM<br/>(off by default)"]
    AI -. "offline or error" .-> FAQ["Offline FAQ from saved guides"]
    DHIS2["packages/dhis2-connector<br/>zero-PII aggregate DataValueSet"] -.-> D2[("DHIS2 (optional)")]
```

## Repository layout

```
.
├── apps/
│   └── web-pwa/          # Vite + React + TS + Tailwind PWA
│       └── src/
│           ├── components/   # Header, BottomNav, ArticleDrawer, AppointmentForm, ConsentSheet, ...
│           ├── data/         # stages + seeded guide content
│           ├── i18n/         # dictionaries, provider, useI18n hook
│           ├── features/     # directory/ (DirectoryScreen, FacilityCard), assistant/ (chat UI, TTS button)
│           ├── screens/      # one file per tab
│           └── services/     # db.ts (Dexie schema + appointment queries), seed.ts, notifications.ts, triage.ts, facilitiesData.ts, chatApi.ts, offlineFaq.ts, speech.ts
├── services/
│   └── rag-engine/       # Python FastAPI RAG service (see its README)
│       ├── app/          # api/routes.py, core/config.py, engine/{ingest,retriever,prompts,...}.py, main.py
│       ├── data/clinical_corpus/   # curated markdown guidelines (prototype content)
│       └── tests/test_rag.py
├── packages/
│   └── dhis2-connector/  # DHIS2 aggregate-reporting connector (TypeScript, tested)
├── scripts/verify-pilot.mjs   # cross-platform pilot readiness check
├── docs/PILOT.md              # deployment + go/no-go guide
├── docker-compose.yml         # web-pwa (nginx) + rag-engine
├── DPG_CHECKLIST.md  CONTRIBUTING.md  SECURITY.md  CODE_OF_CONDUCT.md
├── LICENSE               # Apache-2.0
├── package.json
└── pnpm-workspace.yaml
```

## Design tokens

| Token | Hex | Tailwind class |
| --- | --- | --- |
| Primary Deep Navy | `#0B3C5D` | `navy` |
| Primary Teal | `#1D7A82` | `teal` |
| Accent Soft Pink | `#FCE7F3` | `blush` |
| Slate Neutral Dark | `#1E293B` | `slate-dark` |
| Background Soft | `#F8FAFC` | `surface` |

## Getting started

**Prerequisites:** Node.js 20+ and [pnpm](https://pnpm.io) 9+ (`corepack enable` will provide it).

```bash
pnpm install                    # install all workspace dependencies
pnpm dev                        # start the web-pwa dev server
pnpm --filter web-pwa build     # type-check and production build
pnpm --filter web-pwa lint      # run ESLint
pnpm --filter web-pwa test      # run unit tests (triage engine)
pnpm --filter web-pwa preview   # preview the production build (service worker is active here)
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # whole-monorepo gate
```

### Testing offline mode

The service worker only runs in production builds:

```bash
pnpm --filter web-pwa build && pnpm --filter web-pwa preview
```

Open the preview URL and load it once while online. In Chrome DevTools, check **Application > Service Workers** (activated), then set **Network > Offline** and reload: the app, the guides and language switching keep working.

## RAG engine

`services/rag-engine` is a FastAPI microservice that ingests the curated guideline corpus into ChromaDB, retrieves the top-3 chunks for a question and returns a grounded, non-prescriptive answer with citations. It refuses dosage/diagnosis requests, falls back to a fixed safe message when the corpus has no answer, and always advises seeing a midwife or doctor for danger signs.

```bash
cd services/rag-engine
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --port 8000
```

The corpus is prototype content that needs clinical review - see [services/rag-engine/README.md](services/rag-engine/README.md) for limitations.

## AI Assistant tab

The Assistant tab (`apps/web-pwa/src/features/assistant/`) talks to the RAG engine through `services/chatApi.ts` (`POST /api/chat`, 5 s timeout, never throws).

Run both services for the full experience:

```bash
# terminal 1
cd services/rag-engine && uvicorn app.main:app --port 8000
# terminal 2
pnpm dev            # /api is proxied to http://localhost:8000 (override with VITE_RAG_API_URL, see apps/web-pwa/.env.example)
```

Safety order for every message:
1. **Triage first.** `evaluateSymptoms()` runs on the text before anything else. A danger sign opens the red emergency modal and posts an urgent referral card; **no network request is made**.
2. **Offline / unreachable / timeout / bad response** -> an "Offline Mode" banner plus keyword-matched cards from the guides saved on the device (Dexie, falling back to the bundled copy).
3. Otherwise the grounded answer is shown with expandable sources.

Every answer and fallback card has a **Listen** button (browser `speechSynthesis`; en-GB/en-US voice for English, the system default voice for Hausa and Pidgin; hidden-safe on browsers without speech support). Chat history lives in memory only - nothing is stored - and **Clear chat** wipes it.

Known limits: the backend currently answers in English even when Hausa/Pidgin is selected (its corpus is English), so the voice reads English text with the selected language's voice setting; offline matching is keyword-based over the 6 seeded guides; in production `/api` must be routed to the RAG engine by your reverse proxy (the Vite proxy only covers `dev` and `preview`).

## Privacy and security

- **Settings and privacy** (gear icon in the header): plain-language NDPA privacy card, **Export My Data** (JSON of appointments and settings), **Delete All My Data** (deletes the IndexedDB database, destroys the encryption key, clears local/session storage, closes notifications, reloads clean) and a **storage audit** in KB.
- **Encrypted fields:** appointment notes and the emergency contact number are encrypted with AES-GCM 256 (Web Crypto) before they reach IndexedDB. The key is random, non-extractable and stored on the device; it is destroyed on delete. This protects data at rest from casual inspection; it does not protect against someone using the unlocked app. Needs a secure context (https or localhost), otherwise notes cannot be saved (it fails closed, never to plaintext). Appointment titles and facility names are not encrypted.
- **CSP:** `apps/web-pwa/index.html` ships a strict Content-Security-Policy (`default-src 'self'`, no external scripts, styles, fonts or beacons, `connect-src 'self'`) and `referrer: no-referrer`. It is relaxed automatically in `pnpm dev` only. A `<meta>` CSP cannot set `frame-ancestors`, so also send real security headers (CSP incl. `frame-ancestors 'none'`, `X-Content-Type-Options`, HSTS) from your host. If you host the RAG engine on another origin, add it to `connect-src`.
- **`packages/dhis2-connector`:** open-source DHIS2 `DataValueSet` builder for aggregate reporting with a strict no-PII allow-list. See its README (including why one phone's counts are not truly aggregate).

```bash
pnpm install
pnpm build && pnpm lint && pnpm test     # runs across web-pwa and the connector
```

## End-to-end tests

Playwright runs five user journeys on an emulated Pixel 5 (language switch, appointment + discreet reminder, emergency interception with no network call, delete-all-data, offline use). It builds and serves the app itself.

```bash
pnpm --filter web-pwa e2e:install    # once: downloads Chromium
pnpm e2e
```

## Run with Docker

```bash
cp .env.example .env
docker compose build
docker compose up -d                 # app on http://localhost (80/443); rag-engine stays internal
node scripts/verify-pilot.mjs --skip-build --web-url=http://localhost
```

nginx serves the PWA with a strict CSP, `X-Frame-Options: DENY`, `nosniff`, and gzip/brotli, and proxies `/api` to the RAG engine. TLS and production notes: [docs/PILOT.md](docs/PILOT.md).

## Pilot readiness check

`node scripts/verify-pilot.mjs` builds everything, verifies the PWA is under 5 MB, runs lint, typecheck and unit tests, checks the RAG `/health` endpoint (needs the service running; `--skip-rag` to omit) and validates a DHIS2 payload against the DataValueSet schema with a zero-PII check. Options: `--rag-url`, `--web-url`, `--rag-pytest`, `--e2e`, `--skip-build`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Issues and pull requests are welcome; clinical or translation changes need a cited source and reviewer.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

# Data Protection Impact Assessment (DRAFT)

**Status: draft prepared from the code in this repository. It must be reviewed, completed and signed by the deploying organisation (the data controller) and, where required, a qualified data-protection professional, before any pilot with real users.** It is not legal advice and does not claim NDPA 2023 compliance.

| | |
|---|---|
| Product | MamaCare AI (web PWA + optional RAG service) |
| Version assessed | `main` branch (see git history) |
| Controller (to be named) | _TBD: the organisation that deploys it for a pilot_ |
| Contact | najibadam@gmail.com |
| Reviewer / date | _TBD_ |

## 1. Purpose and processing

MamaCare AI gives pregnant and postnatal women health education, appointment tracking, danger-sign alerts and a facility directory. It is educational and does not diagnose or treat (see [SAFETY.md](../SAFETY.md)).

## 2. Data inventory (as implemented)

| Data | Where it lives | Protection | Leaves the device? |
|---|---|---|---|
| Appointments (type, date, title, facility) | Browser IndexedDB | Not encrypted (low sensitivity by design: titles are user-chosen) | No |
| Appointment notes, emergency contact number | Browser IndexedDB | AES-GCM 256, non-extractable key | No |
| Language and reminder preferences | Browser IndexedDB | None | No |
| Reminder notifications | Generated on-device | Discreet text by default (no clinical wording) | No |
| Chat questions | Memory only; sent to `/api/chat` **only** if triage finds no danger sign and the device is online | TLS (in production); not stored or logged by the RAG service | Yes, to the deployer's RAG server |
| Danger-sign messages | Evaluated on-device | Never transmitted (verified by an end-to-end test) | No |
| Device location | Optional "nearest facility", memory only, after a prompt | Not stored | No |
| Server access logs (nginx) | Deployer's server | IP address, path, time | Stays on server |
| DHIS2 aggregate counts | Built on request | Allow-list; no free text, names or dates | Only if the deployer sends it |

There are no accounts, no analytics, no advertising and no third-party requests (enforced by CSP). Special-category (health) data is present in appointments, notes and chat text, so it is treated as sensitive.

## 3. Lawful basis and consent (to confirm with counsel)

- Reminders: explicit in-app consent before the browser permission prompt; one-tap revoke.
- Chat to the server: the user chooses to send a question. The app should state this clearly at first use; **gap:** there is no separate first-launch consent screen for chat transmission. Recommended before pilot.
- Data subject rights: access/portability via **Export My Data**; erasure via **Delete All My Data**. Data lives on the user's device, so there is no server record to search or delete.

## 4. Risks and mitigations

| Risk | Likelihood | Severity | Mitigation | Residual |
|---|---|---|---|---|
| Shared or borrowed phone reveals pregnancy | Medium | High | Discreet reminders, no icon, encrypted notes, quick delete | Medium: unlocked app is readable; titles unencrypted |
| Device theft/loss | Medium | Medium | Encryption of notes and contact; no cloud copy | Medium |
| Question text exposed in transit or at the server | Low | High | TLS required; no body logging in the app; extractive answers by default | Low-Medium: depends on the deployer's proxy/logging |
| External LLM enabled and receives questions | Only if enabled | High | Off by default; documented in PILOT.md; internal-only Docker network | Controller decision |
| Wrong or unsafe health information | Medium | High | Deterministic triage; guardrails; refusal of dosage/diagnosis; clinical review required | **High until clinical sign-off** |
| Re-identification via DHIS2 small cells | Low | Medium | Aggregates only; optional small-cell suppression | Low |
| Access-log IPs | High | Low | Short retention; state in privacy notice | Low |
| Minors using the app | Possible | Medium | No profiling or accounts; see [SAFEGUARDING.md](SAFEGUARDING.md) | Medium |

## 5. Actions required before a pilot

1. Name the controller; decide whether NDPC registration or a DPO is required; obtain legal review.
2. Publish a plain-language privacy notice in English, Hausa and Pidgin (including log retention and who to contact).
3. Add a first-launch statement that chat questions are sent to a server.
4. Complete clinical and language review of all content.
5. Configure log retention (e.g. 14 days) and confirm no request bodies are logged by any proxy.
6. Agree a breach-response process (72-hour notification practice under NDPA) and test it.
7. Re-run this assessment after any change that adds storage, accounts, analytics or an external LLM.

## 6. Sign-off

Controller: ______________  Date: ______  Reviewer: ______________  Date: ______

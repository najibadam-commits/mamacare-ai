# Security policy

## Reporting a vulnerability

Do **not** open a public issue. Email the maintainers at **security@REPLACE-ME.example** (set this before publishing; the project owner must monitor it) with steps to reproduce. We aim to acknowledge within 3 working days.

## Scope and design

- Data stays on the device (IndexedDB). Notes and the emergency contact number are AES-GCM encrypted with a non-extractable key; this does not protect against someone using an unlocked app.
- Strict CSP, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, HSTS (when TLS is enabled) are set by nginx (`apps/web-pwa/nginx/`).
- The RAG engine is not published on the host in `docker-compose.yml`; only nginx reaches it, over an internal network. Its container runs as non-root with all capabilities dropped.
- No accounts, no analytics. The DHIS2 connector sends counts only.

## Known limitations

No independent security audit has been performed. If you enable an external LLM, user questions leave your network; review that before doing so.

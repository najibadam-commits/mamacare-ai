# Security policy

## Supported versions

Only the current `main` branch is supported. Fixes are made on `main`; there are no maintained back-ports.

| Version | Supported |
|---|---|
| `main` (latest) | Yes |
| Older commits and forks | No |

## Reporting a vulnerability

Please report privately **before** opening any public issue or pull request.

- Email **najibadam@gmail.com** with the subject line `MamaCare AI security`.
- Include what you found, steps to reproduce, affected files or versions, and the impact you expect. Do not include real patient or user data.
- Please give us reasonable time to fix the problem before public disclosure. We will credit reporters who want credit.

Clinical-safety defects (for example a danger sign the triage engine misses) are treated the same way; see [SAFETY.md](SAFETY.md).

## Triage SLA

- **Acknowledgement:** within 48 hours of receipt.
- We then assess severity, tell you our plan, and keep you updated until the issue is fixed and disclosed.

## Security design (summary)

- Data stays on the device (IndexedDB). Notes and the emergency contact number are AES-GCM encrypted with a non-extractable key; this does not protect against someone using an unlocked app.
- Strict CSP, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, and HSTS (when TLS is enabled) are set by nginx (`apps/web-pwa/nginx/`).
- In `docker-compose.yml` the RAG engine is not published on the host; only nginx reaches it over an internal network. Its container runs as non-root with all capabilities dropped.
- No accounts and no analytics. The DHIS2 connector sends counts only.

## Known limitations

No independent security audit or penetration test has been performed. If you enable an external LLM, user questions leave your network; review that before doing so.

# Pilot deployment guide

For a small, supervised pilot (one facility or LGA). Read the **go/no-go list** at the end first.

## 1. Requirements

- A Linux server (1 vCPU / 2 GB RAM is enough for the default hash embeddings; allow ~2 GB more and a larger image if you switch to `sentence-transformers`), Docker Engine 24+ with Compose v2, a domain name, and a TLS certificate (Let's Encrypt is fine). **The PWA needs HTTPS** (service worker, encryption and notifications all require a secure context).

## 2. Deploy

```bash
git clone <your fork> mamacare-ai && cd mamacare-ai
cp .env.example .env              # edit if needed
docker compose build              # builds web-pwa (Node -> nginx) and rag-engine (Python)
docker compose up -d
docker compose ps                 # both services should become "healthy"
node scripts/verify-pilot.mjs --skip-build --web-url=http://localhost
```

### TLS

Put `fullchain.pem` and `privkey.pem` in `deploy/certs/` (git-ignored), set `FORCE_HTTPS=true` in `.env`, then `docker compose up -d`. nginx then redirects port 80 to 443 and sends HSTS. Alternatively terminate TLS at a load balancer or Caddy/Traefik in front of the `web-pwa` container.

### Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `WEB_PORT` / `WEB_TLS_PORT` | 80 / 443 | Host ports |
| `FORCE_HTTPS` | false | Enable TLS listener + redirect + HSTS |
| `RAG_EMBEDDING_BACKEND` | hash | `hash` (offline) or `sentence-transformers` |
| `RAG_MIN_RELEVANCE` | 0.12 | Retrieval threshold; retune with the embedding backend |
| `RAG_LLM_*` | unset | Optional external LLM. **Sends user question text to that provider.** The `backend` network is internal (no internet), so enabling this also requires changing the network in `docker-compose.yml`. Complete a data-protection review first. |

Architecture: browser -> nginx (`web-pwa`, 80/443) -> `/api/*` proxied -> `rag-engine:8000` (internal network, not exposed on the host). The CSP uses `connect-src 'self'`, so the backend is reached same-origin; add any other origin deliberately in `apps/web-pwa/nginx/snippets/security-headers.conf`.

## 3. Operations

- **Health:** `GET /healthz` (nginx), `GET /api/health` (proxied RAG `/health`). Docker health checks use both. Alert on unhealthy containers.
- **Logs:** `docker compose logs -f`. The app collects no analytics; nginx access logs contain IPs, so set a short retention (e.g. 14 days) and state it in your privacy notice. Chat text is not logged by the app.
- **Backups:** user data lives only on users' devices; there is nothing to back up for it. The Chroma index (volume `chroma-data`) is rebuilt from the corpus at startup, so back up the corpus in git, not the volume.
- **Updates:** `git pull && docker compose build && docker compose up -d`. Bump `MAMACARE_VERSION`. Guides re-seed on `guidesSeedVersion` changes.
- **Rollback:** redeploy the previous tag.

## 4. Governance before real users

1. **Clinical sign-off:** a named clinician reviews `services/rag-engine/data/clinical_corpus/`, `apps/web-pwa/src/data/guides.seed.ts`, the triage phrase lists, and the offline FAQ, against current FMoH/NPHCDA/WHO documents. Record reviewer and date.
2. **Language review:** native Hausa and Pidgin health workers review all translations and the glossary.
3. **Facility data:** replace the sample directory with verified Health Facility Registry data (phone numbers, verified dates).
4. **NDPA 2023:** assess whether you are a data controller, complete a DPIA, publish a privacy notice, register with the NDPC if required, and obtain legal advice. The app stores personal data only on the user's own device, but server logs and any enabled LLM change that picture.
5. **Safeguarding:** appoint a contact; decide the policy for under-18 users.
6. **Emergency pathway:** confirm 112 and the facility referral routes work in the pilot area.
7. **DHIS2:** agree data elements and org unit UIDs with the state HMIS officer; note single-device counts are not truly aggregate (see connector README).

## 5. Support runbook

| Symptom | Check |
|---|---|
| Assistant shows "Offline Mode" for everyone | `docker compose ps`; `docker compose logs rag-engine`; `curl localhost/api/health` |
| Blank page / not installable | Is it HTTPS? Is `sw.js` served? Hard-refresh to update the service worker |
| Notes cannot be saved | Insecure context (HTTP); encryption fails closed by design |
| Users report reminders missing | Reminders only fire while the app is open (see README); permission may be denied in browser settings |
| User asks for data deletion | Settings -> Delete All My Data (all data is on their device) |

## 6. Go / no-go checklist

- [ ] `node scripts/verify-pilot.mjs --e2e --rag-pytest` passes on the release build
- [ ] `docker compose build` and `up -d` succeed on the target server; both containers healthy
- [ ] HTTPS valid; security headers confirmed (e.g. via securityheaders.com or `curl -I`)
- [ ] Clinical and language sign-off recorded
- [ ] Facility directory verified
- [ ] DPIA/privacy notice done; owner and contacts set in SECURITY.md and CODE_OF_CONDUCT.md
- [ ] Tested on target low-end Android devices and on 2G/3G
- [ ] Pilot staff trained; feedback and incident channel agreed; stop criteria defined

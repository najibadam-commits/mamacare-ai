#!/usr/bin/env node
/**
 * MamaCare AI - pilot readiness check (cross-platform: Windows, macOS, Linux; Node 20+).
 *
 *   node scripts/verify-pilot.mjs [options]
 *
 *   --rag-url=URL     RAG engine base URL            (default http://localhost:8000, or $RAG_URL)
 *   --web-url=URL     Also check the proxied /api/health of a running web container (e.g. http://localhost)
 *   --skip-build      Reuse existing build output instead of rebuilding
 *   --skip-rag        Skip the live RAG /health check (e.g. when the service is not running)
 *   --rag-pytest      Also run the Python RAG test-suite (needs python + services/rag-engine/requirements.txt)
 *   --e2e             Also run the Playwright end-to-end suite
 *
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback

const RAG_URL = opt('rag-url', process.env.RAG_URL ?? 'http://localhost:8000').replace(/\/+$/, '')
const WEB_URL = opt('web-url', '')
const SIZE_LIMIT = 5 * 1024 * 1024
const results = []
const isWin = process.platform === 'win32'

const record = (name, status, detail = '') => {
  results.push({ name, status, detail })
  const icon = status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`  [${icon}] ${name}${detail ? ` - ${detail}` : ''}`)
}

function run(label, command, commandArgs, cwd = root) {
  console.log(`\n> ${label}: ${command} ${commandArgs.join(' ')}`)
  const r = spawnSync(command, commandArgs, { cwd, stdio: 'inherit', shell: isWin })
  return r.status === 0
}

function dirSize(dir) {
  let total = 0
  let largest = { name: '', size: 0 }
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else {
        total += s.size
        if (s.size > largest.size) largest = { name: p.slice(dir.length + 1), size: s.size }
      }
    }
  }
  walk(dir)
  return { total, largest }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`

// 1. Build + size budget ---------------------------------------------------------------
console.log('\n== 1. PWA build and size budget ==')
if (flag('skip-build') ? true : run('build all packages', 'pnpm', ['-r', 'build'])) {
  const dist = join(root, 'apps/web-pwa/dist')
  if (!existsSync(dist)) record('PWA build output exists', 'fail', 'apps/web-pwa/dist not found (run without --skip-build)')
  else {
    const { total, largest } = dirSize(dist)
    record(
      'PWA build under 5 MB',
      total < SIZE_LIMIT ? 'pass' : 'fail',
      `${kb(total)} total (limit ${kb(SIZE_LIMIT)}); largest file ${largest.name} ${kb(largest.size)}`,
    )
    record('Service worker generated', existsSync(join(dist, 'sw.js')) ? 'pass' : 'fail')
    record('Web manifest generated', existsSync(join(dist, 'manifest.webmanifest')) ? 'pass' : 'fail')
  }
} else {
  record('Build', 'fail', 'pnpm -r build failed')
}

// 2. Lint, typecheck, unit tests ----------------------------------------------------------
console.log('\n== 2. Lint, typecheck and unit tests (all packages) ==')
record('Lint', run('lint', 'pnpm', ['-r', 'lint']) ? 'pass' : 'fail')
record('Typecheck', run('typecheck', 'pnpm', ['-r', 'typecheck']) ? 'pass' : 'fail')
record('Unit tests (web-pwa, dhis2-connector)', run('unit tests', 'pnpm', ['-r', 'test']) ? 'pass' : 'fail')

if (flag('rag-pytest')) {
  const ragDir = join(root, 'services/rag-engine')
  const venvPy = [join(ragDir, '.venv/bin/python'), join(ragDir, '.venv/Scripts/python.exe')].find(existsSync)
  const candidates = [process.env.PYTHON, venvPy, 'python3', 'python', 'py'].filter(Boolean)
  const py = candidates.find((c) => spawnSync(c, ['-c', 'import fastapi, chromadb'], { shell: isWin, stdio: 'ignore' }).status === 0)
  if (!py) record('RAG engine pytest', 'skip', 'no Python with the rag-engine requirements found (create services/rag-engine/.venv and pip install -r requirements.txt, or set PYTHON)')
  else record('RAG engine pytest', run('pytest', py, ['-m', 'pytest', '-q'], join(root, 'services/rag-engine')) ? 'pass' : 'fail')
}

// 3. RAG service health -------------------------------------------------------------------
console.log('\n== 3. RAG service health ==')
async function checkHealth(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const body = await res.json().catch(() => ({}))
    if (res.status !== 200) return record(label, 'fail', `HTTP ${res.status} from ${url}`)
    if (body.status !== 'ok') return record(label, 'fail', `status="${body.status}" (expected "ok")`)
    if (!body.vector_index?.ready) return record(label, 'fail', 'vector index is not ready')
    record(label, 'pass', `HTTP 200, ${body.vector_index.chunks} chunks / ${body.vector_index.documents} documents, generator=${body.generator}`)
  } catch (err) {
    record(label, 'fail', `${url} unreachable (${err?.cause?.code ?? err?.message}). Start it: docker compose up -d  or  cd services/rag-engine && uvicorn app.main:app`)
  }
}
if (flag('skip-rag')) record('RAG /health', 'skip', '--skip-rag')
else {
  await checkHealth('RAG /health returns 200', `${RAG_URL}/health`)
  if (WEB_URL) await checkHealth('Web container proxies /api/health', `${WEB_URL.replace(/\/+$/, '')}/api/health`)
}

// 4. DHIS2 payload conformance ---------------------------------------------------------------
console.log('\n== 4. DHIS2 DataValueSet conformance ==')
try {
  const entry = join(root, 'packages/dhis2-connector/dist/index.js')
  if (!existsSync(entry)) throw new Error('connector not built (run without --skip-build)')
  const c = await import(pathToFileURL(entry).href)

  const orgUnit = 'Ab1Cd2Ef3Gh'
  const mapping = {
    dataElements: { ancVisitsAttended: 'deAncVisit1', postnatalCheckupsCompleted: 'dePostnatl2', childImmunizationsLogged: 'deImmunize3', obstetricRedAlerts: 'deRedAlert4' },
    dataSet: 'dsMamaCare1',
  }
  const pii = { title: 'Amina Yusuf', notes: 'phone 08031234567 DOB 1995-03-14', facilityName: 'Gwarzo General Hospital' }
  const appts = [
    { ...pii, appointmentType: 'antenatal', status: 'completed', date: '2026-10-05' },
    { ...pii, appointmentType: 'postnatal', status: 'completed', date: '2026-10-09' },
    { ...pii, appointmentType: 'immunization', status: 'completed', date: '2026-10-17' },
    { ...pii, appointmentType: 'antenatal', status: 'scheduled', date: '2026-10-28' },
  ]
  const payload = c.buildDataValueSet(c.aggregateMetrics(appts, { redAlerts: 1 }, orgUnit, '202610'), mapping, { completeDate: '2026-11-01' })

  const UID = /^[A-Za-z][A-Za-z0-9]{10}$/
  const problems = []
  const allowedTop = new Set(['dataSet', 'period', 'orgUnit', 'completeDate', 'dataValues'])
  const allowedValue = new Set(['dataElement', 'categoryOptionCombo', 'attributeOptionCombo', 'value', 'period', 'orgUnit'])
  for (const k of Object.keys(payload)) if (!allowedTop.has(k)) problems.push(`unexpected top-level field ${k}`)
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(payload.period)) problems.push('period is not yyyyMM')
  if (!UID.test(payload.orgUnit)) problems.push('orgUnit is not a UID')
  if (!Array.isArray(payload.dataValues) || payload.dataValues.length !== 4) problems.push('expected 4 dataValues')
  for (const dv of payload.dataValues ?? []) {
    for (const k of Object.keys(dv)) if (!allowedValue.has(k)) problems.push(`unexpected dataValue field ${k}`)
    if (!UID.test(dv.dataElement)) problems.push(`dataElement ${dv.dataElement} is not a UID`)
    if (typeof dv.value !== 'string' || !/^\d+$/.test(dv.value)) problems.push(`value ${JSON.stringify(dv.value)} must be a digit string`)
  }
  const json = JSON.stringify(payload)
  for (const secret of ['Amina', 'Yusuf', '0803', '1995', 'Gwarzo', '2026-10-05', 'antenatal']) if (json.includes(secret)) problems.push(`PII leak: "${secret}"`)
  const counts = payload.dataValues.map((v) => v.value).join(',')
  if (counts !== '1,1,1,1') problems.push(`unexpected counts ${counts} (expected 1,1,1,1)`)
  if (c.validateDataValueSet(payload).length) problems.push('connector validator rejected its own payload')
  if (c.validateDataValueSet({ ...payload, dataValues: [{ ...payload.dataValues[0], comment: 'x' }] }).length === 0) problems.push('validator accepted a payload with a free-text comment')

  record('DHIS2 payload matches POST /api/dataValueSets schema and has zero PII', problems.length ? 'fail' : 'pass', problems.join('; '))
} catch (err) {
  record('DHIS2 payload conformance', 'fail', String(err?.message ?? err))
}

// 5. Optional end-to-end suite ---------------------------------------------------------------
if (flag('e2e')) {
  console.log('\n== 5. End-to-end (Playwright) ==')
  record('Playwright E2E journeys', run('e2e', 'pnpm', ['--filter', 'web-pwa', 'e2e']) ? 'pass' : 'fail')
}

// Summary ------------------------------------------------------------------------------------------
const failed = results.filter((r) => r.status === 'fail')
const skipped = results.filter((r) => r.status === 'skip')
console.log('\n================ Pilot readiness summary ================')
for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : r.status === 'skip' ? 'SKIP' : 'FAIL'}  ${r.name}`)
console.log(`\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`)
console.log(failed.length ? 'NOT READY: fix the failures above.' : 'All automated checks passed. Complete the manual go/no-go list in docs/PILOT.md.')
process.exit(failed.length ? 1 : 0)

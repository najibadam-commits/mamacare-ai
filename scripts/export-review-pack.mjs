#!/usr/bin/env node
/**
 * Generates docs/clinical-review/TRIAGE_REVIEW_SHEET.md: every triage danger sign, its advice text and every
 * phrase the engine matches, in all three languages, so clinicians and native-speaker health workers can review
 * and sign it. Run after any change to triage.ts or the translations:  node scripts/export-review-pack.mjs
 */
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'apps/web-pwa/package.json'))
let esbuild
try { esbuild = require('esbuild') } catch { esbuild = require(join(root, 'node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild')) }

const tmp = mkdtempSync(join(tmpdir(), 'review-'))
const out = join(tmp, 'triage.mjs')
esbuild.buildSync({ entryPoints: [join(root, 'apps/web-pwa/src/services/triage.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const triage = await import(pathToFileURL(out).href)

const langs = [['en', 'English'], ['ha', 'Hausa'], ['pcm', 'Nigerian Pidgin']]
const all = triage.listTriagePhrases()
const lines = []
lines.push('# Triage review sheet', '')
lines.push('Generated from the code by `scripts/export-review-pack.mjs`. Do not edit by hand.', '')
lines.push('**Purpose:** a clinician and a native-speaker health worker check, for each danger sign, that (1) the advice is clinically right and safe, (2) the translated labels and advice are natural and correct, (3) the listed phrases are things women really say, and (4) nothing important is missing. The engine scans all three languages whatever language the app is set to, and it does not ignore negations ("I am not bleeding" still alerts) by design.', '')
lines.push('Mark each item OK / CHANGE (with the correction) / REMOVE. Sign at the end of each sign.', '')
for (const id of triage.DANGER_SIGN_IDS) {
  const forSign = all.filter((p) => p.id === id)
  const urg = [...new Set(forSign.map((p) => p.urgency))].join(' / ')
  lines.push('## ' + id.replace(/_/g, ' ') + '  (urgency: ' + urg + ')', '')
  for (const [lc, ln] of langs) {
    const phrases = forSign.filter((p) => p.language === lc)
    const sample = phrases[0]?.phrase ?? ''
    const r = triage.evaluateSymptoms(sample, lc)
    lines.push('### ' + ln, '')
    lines.push('- Label shown to the user: ' + (r.matches[0]?.label ?? '(none)'))
    lines.push('- Advice shown to the user: ' + (r.recommendedAction || '(none)'))
    lines.push('- Phrases that trigger it (' + phrases.length + '):')
    const uniq = [...new Set(phrases.map((p) => p.phrase))]
    lines.push('  ' + uniq.join(' | '))
    lines.push('- Reviewer decision: [ ] OK  [ ] CHANGE  [ ] REMOVE   Notes: ______________________', '')
  }
  lines.push('Reviewed by (name, role): ______________________  Signature: ____________  Date: ________', '', '---', '')
}
mkdirSync(join(root, 'docs/clinical-review'), { recursive: true })
writeFileSync(join(root, 'docs/clinical-review/TRIAGE_REVIEW_SHEET.md'), lines.join('\n'))
// Machine-readable copy for the printable (Word/PDF) pack builder.
const data = triage.DANGER_SIGN_IDS.map((id) => ({
  id,
  languages: langs.map(([lc, ln]) => {
    const pats = triage.listTriagePatterns().filter((p) => p.id === id && p.language === lc)
    const sample = all.find((p) => p.id === id && p.language === lc)?.phrase ?? ''
    const r = triage.evaluateSymptoms(sample, lc)
    return { code: lc, name: ln, label: r.matches[0]?.label ?? '', advice: r.recommendedAction,
      urgent: pats.filter((p) => p.urgency === 'urgent').map((p) => p.pattern),
      emergency: pats.filter((p) => p.urgency === 'emergency').map((p) => p.pattern),
      expanded: all.filter((p) => p.id === id && p.language === lc).length }
  }),
}))
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(data, null, 1))
console.log('Wrote docs/clinical-review/TRIAGE_REVIEW_SHEET.md (' + all.length + ' phrases, ' + triage.DANGER_SIGN_IDS.length + ' danger signs)')

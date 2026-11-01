/**
 * Deterministic clinical safety interceptor.
 *
 * - Pure, synchronous, no network, no ML: the same text ALWAYS gives the same result.
 * - Scans English, Hausa and Nigerian Pidgin phrases in EVERY call, whatever `language` is passed
 *   (people code-switch, and a missed danger sign is worse than a false alarm).
 *   `language` only decides which language the returned labels/advice are written in.
 * - Fail-safe by design: negations ("no bleeding") are NOT filtered out.
 * - Text is normalised (case, accents, Hausa hooked letters ɓ ɗ ƙ ƴ -> b d k y, apostrophes, punctuation)
 *   so "Farfaɗiya", "farfadiya" and "FARFADIYA!!" are identical.
 *
 * Pattern syntax (see expand()/compile()):  "(a|b)" alternation (may be empty: "(is |)"),
 * and a trailing "*" on a word = prefix match ("bleed*" matches bleeding, bleed, bleeds).
 *
 * This is a clinical-safety net, not a diagnosis tool. Every phrase list must be reviewed by clinicians
 * and native-speaker health workers before release.
 */
import { dictionaries } from '../i18n/strings'
import type { StringKey } from '../i18n/strings'
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n/languages'
import type { Language } from '../i18n/languages'

export type TriageUrgency = 'emergency' | 'urgent'
export type DangerSignId =
  | 'severe_bleeding'
  | 'pre_eclampsia'
  | 'convulsions'
  | 'waters_broke'
  | 'reduced_fetal_movement'
  | 'fever_malaria'
  | 'postpartum_complication'

export interface TriageMatch {
  id: DangerSignId
  urgency: TriageUrgency
  /** The user's own words (normalised) that triggered this sign. */
  matchedText: string
  /** Which phrase list matched. */
  matchedLanguage: Language
  /** Localised short name of the danger sign. */
  label: string
}

export interface TriageResult {
  /** True when ANY danger sign matched (emergency or urgent). */
  critical: boolean
  urgency: TriageUrgency | 'none'
  matches: TriageMatch[]
  matchedSymptoms: DangerSignId[]
  /** Sign whose advice leads (highest urgency, then rule priority). */
  primarySign: DangerSignId | null
  /** Localised recommended clinical action (empty when nothing matched). */
  recommendedAction: string
  normalizedQuery: string
}

type PhraseSet = Record<Language, string[]>

interface Rule {
  id: DangerSignId
  /** Urgency of `terms`. */
  urgency: TriageUrgency
  terms: PhraseSet
  /** Weaker phrases; always 'urgent'. Only used if no `terms` matched. */
  softTerms?: PhraseSet
}

// ---------------------------------------------------------------------------
// Phrase lists

const RULES: Rule[] = [
  {
    id: 'severe_bleeding',
    urgency: 'emergency',
    terms: {
      en: [
        'bleed*', 'haemorrhag*', 'hemorrhag*', 'spotting',
        'blood (is |)(coming|pouring|flowing|gushing|running|dripping) out',
        '(lot|lots) of blood', 'heavy (blood|bleeding|flow)', 'blood clot*', 'clots',
        'soak* (a |my |)pad*', 'soaked through', 'vaginal blood*',
        'blood from (my |the |)(vagina|private part*|private)',
        'blood (in|on) (my |)(underwear|panties|pants)',
      ],
      ha: [
        'zubar jini', 'zubar da jini', 'zubewar jini', 'jini (yana|na|ya) (zuba|zubo|fita|fitowa|zubowa)',
        'jini mai yawa', 'jini da yawa', 'jini daga farji', 'jini a farji', 'gudan jini', 'jini ya cika',
      ],
      pcm: [
        'bleed*', 'blood (dey|de|dae|don) (commot|comot|come out|come*|flow|run|pour|fall|drip)',
        '(plenty|too much|plenty plenty|a lot of) blood', 'blood (plenty|too much|plenty plenty)',
        'blood (don |)(soak|wet)',
      ],
    },
  },
  {
    id: 'pre_eclampsia',
    urgency: 'emergency',
    terms: {
      en: [
        'blur*', 'vision (is |)(dim|cloudy|double)', 'double vision', 'dim vision',
        '(cant|cannot|can not) see (properly|well|clearly)',
        'seeing (spots|stars|stripes|flashes|flashing lights|black spots|double)', 'see spots', 'flashing lights',
        '(severe|terrible|worst|bad|serious|strong|splitting|excruciating|unbearable|intense|very bad) headache*',
        'headache* (is |)(severe|terrible|worst|very bad|unbearable|wont go|will not go|not going|does not go|doesnt go|wont stop|wont go away)',
        'pre eclampsia', 'preeclampsia', 'eclampsia', 'pre eclamptic',
      ],
      ha: [
        'ciwon kai mai tsanani', 'ciwon kai sosai', 'ciwon kai mai zafi',
        'ciwon kai (wanda |)(ba ya|baya) tafiya',
        '(kai|kaina) (yana|na|ya) ciwo (sosai|mai tsanani|matuka)',
        'gani a duhunce', 'gani (ya|na) (duhu|duhunce|dushe|dusashe)', 'ganina (ya|na) (duhu|duhunce|dusashe)',
        'idanuna (sun|na) (duhunce|duhu|dushe|dusashe)', 'ina ganin duhu', 'ina ganin tabo*', 'ganin tabo*',
        '(ba na|ban|ba nai) gani (sosai|da kyau|kyau)', 'ba na ganin (sosai|da kyau|kyau)',
      ],
      pcm: [
        '(my |)eyes? (dey|de|don|dae) (blur*|dull|dim|dark|cloud*)',
        'eyes? no (dey|de) see (well|clear)', 'i no (fit|dey|de) see (well|clear|clearly|again|anything)',
        'e dey (blur|dark)',
        '(serious|bad|terrible|strong|wicked|severe) headache*',
        'headache* (wey|that) no (dey|de|go|fit) (go|commot|comot|stop)',
        'head (dey|de) (pain|hurt|ache) (me |)(well well|serious|seriously|bad|badly|too much|die|pass)',
        'head (dey|de) (split|crack)',
      ],
    },
    softTerms: {
      en: [
        'headache*', 'head ache*', 'swollen (face|hands|hand|eyelids)',
        'swelling (of |in |on |)(the |my |)(face|hands|hand|eyelids)', 'face (is |)swell*', 'puffy face',
        'high blood pressure', 'hypertension', 'bp (is |)high', 'raised blood pressure',
      ],
      ha: [
        'ciwon kai', '(kai|kaina) (yana|na|ya) ciwo', 'kumburin (fuska|hannaye|hannu|ido)',
        'fuska (ta|na|ya) kumbura', 'fuskata ta kumbura', 'hannuwana sun kumbura', 'hannaye sun kumbura', 'hawan jini',
      ],
      pcm: [
        'headache*', 'head (dey|de|don) (pain|hurt|ache)', 'face (don|dey|de) (swell*|puff*|big)',
        'hands? (don|dey|de) (swell*|puff*)', 'swollen (face|hand*)', 'high blood pressure',
        '(bp|pressure) (dey|de|don|is) (high|up|rise)',
      ],
    },
  },
  {
    id: 'convulsions',
    urgency: 'emergency',
    terms: {
      en: [
        'fits', '(had|having|has) (a |some |)fits?', 'convuls*', 'seizure*', 'eclamptic',
        'shaking (uncontrollably|badly|all over)', 'body (is |)(shaking|jerking|twitching|stiff*)', 'jerking', 'twitching',
        'foaming', 'foam* (at|from|in|for) (the |her |my |)mouth',
        'unconscious*', 'passed out', 'pass out', 'blacked out', 'black out', 'collapse*', 'faint*',
        'not responding', 'unresponsive', '(lost|losing) consciousness', 'cannot wake', 'wont wake',
      ],
      ha: [
        'farfadiya', 'ciwon farfadiya', 'jijjiga', 'suma', '(ta|na|ya) suma', 'faduwa ta suma',
        '(ta |na |ya |)rasa (hayyaci|hankali|sani)', 'fita (daga |a |)hayyaci',
        'jiki (na|yana|ya) (rawa|girgiza|jijjiga)', 'jikina (na|yana|ya) (rawa|girgiza|jijjiga)',
        'girgizar jiki', 'rawar jiki', 'kumfa (a |daga |)baki',
      ],
      pcm: [
        'body (dey|de|dae|don) (shake|shaking|jerk|jerking|twitch)',
        '(she|he|i|e|dem) (dey|de|don) (shake|jerk)', 'dey shake', 'shake shake', 'fits',
        '(dey |don |)(get|catch) fits', '(dey |don |)catch fit',
        '(she|e|he) (don |)(faint*|collapse*|fall down|slump*)', 'faint*', 'collapse*', 'slump*',
        'foam (for|from|inside|at) (her |my |)mouth', 'mouth (dey|de) foam',
        'no (dey|de) (respond|answer|wake)', 'no fit wake', 'pass out',
      ],
    },
  },
  {
    id: 'waters_broke',
    urgency: 'emergency',
    terms: {
      en: [
        '(my |the |)(water|waters|membrane|membranes) (have |has |)(broke|broken|burst|ruptured|leaking|breaking)',
        'water break*', 'broken water', 'ruptured membrane*', 'membranes ruptured',
        'leak* (fluid|water|liquid)', '(fluid|water|liquid) (is |)(leak*|drip*|trickl*)',
        '(fluid|water|liquid) (is |)coming out', 'gush of (fluid|water|liquid)',
      ],
      ha: [
        'ruwa ya fashe', '(ruwan|ruwa) (ciki|haihuwa|nakuda|jariri) ya fashe', 'ruwan ciki ya fashe',
        'fashewar ruwa', 'ruwa (yana|na) (zuba|fita|digowa|diga) daga farji', 'ruwa ya zubo',
        'ruwa yana digowa', 'ruwa na diga',
      ],
      pcm: [
        '(my |)(belle |)water (don|dey|de) (break|burst|comot|commot|leak|drip|run)',
        'water break*', 'water (dey|de) (comot|commot|come out) (from|for) (my |)(body|belle|private|down)',
      ],
    },
  },
  {
    id: 'reduced_fetal_movement',
    urgency: 'emergency',
    terms: {
      en: [
        'baby (is |)(not|no longer|stopped|isnt|hasnt|dont|doesnt|didnt|has not|does not|did not) (moving|move|kicking|kick|moved|kicked|stirring)',
        'baby (is |)(moving|kicking) (less|lesser|slowly|weakly)', 'baby stopped (moving|kicking)',
        '(no|less|reduced|decreased|absent|little) (fetal |foetal |baby |)(movement*|kicks|kicking)',
        '(cant|cannot|can not|dont|do not) feel (my |the |)baby( move*| kick*|)', 'no kicks', 'no kicking',
        'baby (has |)gone (quiet|still)',
      ],
      ha: [
        'jariri (ba ya|baya|ya daina|ya rage) (motsi|motsawa|harbawa)', 'jaririn (ba ya|baya|ya daina|ya rage) (motsi|motsawa|harbawa)',
        'ba na jin (motsin )?jariri( yana motsi|)', 'ban jin (motsin )?jariri', 'motsin jariri ya (ragu|yi kasa|daina)',
        'jariri ya yi shiru', 'cikin (ya|ba ya|baya) (daina |)(motsi|motsawa)', 'cikin ya daina motsi',
      ],
      pcm: [
        'baby (no|don stop to|don stop|no longer) (dey |de |)(move|kick|play)',
        'baby (dey|de) (move|kick) (small|less)',
        'pikin (no|don stop to|don stop|no longer) (dey |de |)(move|kick|play)', 'pikin (dey|de) (move|kick) (small|less)',
        'i no (dey |)feel (my |)(baby|pikin)( move| kick|)', 'belle no (dey |)move', 'e no (dey |)move',
      ],
    },
  },
  {
    id: 'fever_malaria',
    urgency: 'urgent',
    terms: {
      en: [
        'fever*', 'high temperature', 'chills', 'shiver*', 'rigors', 'severe malaria', 'malaria (signs|symptoms|attack)',
        '(body|skin) (is |)(very |)(hot|burning)', 'burning up', 'hot body',
      ],
      ha: [
        'zazzabi*', 'zafin jiki', '(jiki|jikina) (yana|na|ya) zafi', 'jin sanyi', 'ina jin sanyi', 'rawar sanyi',
        'sanyi (yana|na|ya) (damuna|kama ni)', 'zazzabin cizon sauro',
      ],
      pcm: [
        'fever*', 'body (dey|de|don) (hot|burn)', 'body hot', 'hot body', 'body (dey|de|don) shiver', 'dey shiver',
        'shiver*', 'chills', 'cold (dey|de) (catch|shake|worry|do) me', '(high|serious|strong) (fever|temperature)',
        'temperature high', 'malaria (dey|de) (worry|catch|do|beat) me', 'serious malaria',
      ],
    },
  },
  {
    id: 'postpartum_complication',
    urgency: 'emergency',
    terms: {
      en: [
        'severe (lower |)(abdominal|belly|stomach|tummy) pain',
        '(abdominal|belly|stomach|tummy) pain (is |)(severe|very bad|terrible|unbearable|strong|sharp|getting worse)',
        '(sharp|unbearable|terrible|strong|intense|excruciating) (abdominal|belly|stomach|tummy) pain',
        '(abdominal|belly|stomach|tummy) (is |)(hurting|paining) (so |very |too |)(much|badly|a lot)',
        'foul (smell*|odour|odor)', 'foul smelling', 'smelly (discharge|lochia|blood|fluid)',
        '(discharge|lochia|blood|fluid|vagina|bleeding) (is |)(smell*|stink*|foul)',
        'bad smell*', 'stink*', 'offensive (smell|odour|odor|discharge)', 'lochia (smell*|stink*|foul)',
      ],
      ha: [
        'ciwon ciki (mai tsanani|sosai|matuka|mai zafi)', 'ciki (yana|na|ya) ciwo (sosai|mai tsanani|matuka)',
        '(jini|ruwa) mai wari', 'wari daga farji', 'wari a farji', 'mugun wari', 'farji yana wari',
      ],
      pcm: [
        '(serious|bad|terrible|strong|wicked) (belly|belle|stomach) (pain|wahala)',
        '(belly|belle|stomach) (dey|de) pain (me |)(well well|serious|seriously|bad|badly|too much|plenty|die|pass)',
        '(belly|belle|stomach) pain (well well|serious|too much|plenty)',
        'bad smell*', 'smell bad', '(e|water|blood|discharge|private part|body) (dey|de) (smell|stink)',
        'stink*', 'smell (dey|de) (comot|come out)', 'dey smell',
      ],
    },
  },
]

/** Order in which advice leads when several signs match at the same urgency. */
export const DANGER_SIGN_IDS: DangerSignId[] = RULES.map((r) => r.id)

// ---------------------------------------------------------------------------
// Normalisation + compilation

const HAUSA_FOLD: Record<string, string> = { 'ɓ': 'b', 'ɗ': 'd', 'ƙ': 'k', 'ƴ': 'y' }

function normalizeBase(input: string, keepWildcard: boolean): string {
  const lowered = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ɓɗƙƴ]/g, (c) => HAUSA_FOLD[c])
    .replace(/['’‘`´ʼ]/g, '') // "can't" -> "cant", "ya'ya" -> "yaya"
  const allowed = keepWildcard ? /[^a-z0-9*\s]/g : /[^a-z0-9\s]/g
  return lowered.replace(allowed, ' ').replace(/\s+/g, ' ').trim()
}

export const normalizeText = (s: string) => normalizeBase(s, false)

/** "(a|b) c" -> ["a c", "b c"]; supports several groups and empty alternatives. */
export function expand(pattern: string): string[] {
  const m = pattern.match(/\(([^()]*)\)/)
  if (!m) return [pattern]
  return m[1].split('|').flatMap((alt) => expand(pattern.replace(m[0], alt)))
}

interface CompiledPattern {
  source: string
  tokens: string[]
  language: Language
  urgency: TriageUrgency
}

interface CompiledRule {
  rule: Rule
  hard: CompiledPattern[]
  soft: CompiledPattern[]
}

function compileSet(set: PhraseSet | undefined, urgency: TriageUrgency): CompiledPattern[] {
  if (!set) return []
  const out: CompiledPattern[] = []
  for (const language of Object.keys(set) as Language[]) {
    for (const raw of set[language]) {
      for (const expanded of expand(raw)) {
        const norm = normalizeBase(expanded, true)
        if (norm) out.push({ source: norm, tokens: norm.split(' '), language, urgency })
      }
    }
  }
  return out
}

const COMPILED: CompiledRule[] = RULES.map((rule) => ({
  rule,
  hard: compileSet(rule.terms, rule.urgency),
  soft: compileSet(rule.softTerms, 'urgent'),
}))

function tokenMatches(pattern: string, token: string): boolean {
  return pattern.endsWith('*') ? token.startsWith(pattern.slice(0, -1)) : pattern === token
}

/** Returns the matched span of user tokens, or null. */
function findPattern(tokens: string[], p: CompiledPattern): string | null {
  const n = p.tokens.length
  for (let i = 0; i + n <= tokens.length; i++) {
    let ok = true
    for (let j = 0; j < n; j++) {
      if (!tokenMatches(p.tokens[j], tokens[i + j])) {
        ok = false
        break
      }
    }
    if (ok) return tokens.slice(i, i + n).join(' ')
  }
  return null
}

// ---------------------------------------------------------------------------
// Public API

function label(id: DangerSignId, language: Language): string {
  return dictionaries[language][`triage.sign.${id}.name` as StringKey]
}

/**
 * Scans `query` for danger signs. `language` ('en' | 'ha' | 'pcm'; anything else falls back to English)
 * only controls the language of the returned labels and advice.
 */
export function evaluateSymptoms(query: string, language: string): TriageResult {
  const lang: Language = isLanguage(language) ? language : DEFAULT_LANGUAGE
  const normalizedQuery = normalizeText(query ?? '')
  const tokens = normalizedQuery ? normalizedQuery.split(' ') : []
  const matches: TriageMatch[] = []

  for (const { rule, hard, soft } of COMPILED) {
    let found: { span: string; p: CompiledPattern } | null = null
    for (const p of hard) {
      const span = findPattern(tokens, p)
      if (span) {
        found = { span, p }
        break
      }
    }
    if (!found) {
      for (const p of soft) {
        const span = findPattern(tokens, p)
        if (span) {
          found = { span, p }
          break
        }
      }
    }
    if (found) {
      matches.push({
        id: rule.id,
        urgency: found.p.urgency,
        matchedText: found.span,
        matchedLanguage: found.p.language,
        label: label(rule.id, lang),
      })
    }
  }

  if (matches.length === 0) {
    return { critical: false, urgency: 'none', matches: [], matchedSymptoms: [], primarySign: null, recommendedAction: '', normalizedQuery }
  }

  // Emergencies first, otherwise keep rule order.
  matches.sort((a, b) => Number(b.urgency === 'emergency') - Number(a.urgency === 'emergency'))
  const urgency: TriageUrgency = matches[0].urgency
  const primary = matches[0].id
  const dict = dictionaries[lang]
  const actionKey: StringKey = `triage.sign.${primary}.action`
  const generic: StringKey = urgency === 'emergency' ? 'triage.action.emergency' : 'triage.action.urgent'

  return {
    critical: true,
    urgency,
    matches,
    matchedSymptoms: matches.map((m) => m.id),
    primarySign: primary,
    recommendedAction: `${dict[generic]} ${dict[actionKey]}`,
    normalizedQuery,
  }
}

/** Every expanded phrase per rule, for exhaustive tests and clinical review. */
export function listTriagePhrases(): { id: DangerSignId; language: Language; urgency: TriageUrgency; phrase: string }[] {
  return COMPILED.flatMap(({ rule, hard, soft }) =>
    [...hard, ...soft].map((p) => ({ id: rule.id, language: p.language, urgency: p.urgency, phrase: p.source })),
  )
}

/** The compact phrase patterns (before expansion) per danger sign, for printable clinical review sheets. */
export function listTriagePatterns(): { id: DangerSignId; language: Language; urgency: TriageUrgency; pattern: string }[] {
  const out: { id: DangerSignId; language: Language; urgency: TriageUrgency; pattern: string }[] = []
  for (const rule of RULES) {
    for (const [set, urgency] of [[rule.terms, rule.urgency], [rule.softTerms, 'urgent']] as const) {
      if (!set) continue
      for (const language of Object.keys(set) as Language[]) {
        for (const pattern of set[language]) out.push({ id: rule.id, language, urgency: urgency as TriageUrgency, pattern })
      }
    }
  }
  return out
}

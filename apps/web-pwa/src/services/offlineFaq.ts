import { SEED_GUIDES } from '../data/guides.seed'
import type { GuideCategory } from '../data/stages'
import type { Language } from '../i18n/languages'
import { db } from './db'

/** The subset of a guide needed for offline matching (both Dexie rows and seed data fit). */
export interface SearchableGuide {
  slug: string
  category: GuideCategory
  title: string
  summary: string
  content: string
  keyTakeaways: string[]
  warning?: string
}

export interface OfflineCard {
  slug: string
  category: GuideCategory
  title: string
  summary: string
  takeaways: string[]
  warning?: string
  score: number
}

const STOPWORDS = new Set(
  `a an the and or of to in on at for from with by is are was were be am do does did can could should would will
   how what when where which who why i me my we you your it its this that these those there get got give take
   help please tell about any some much many more most very also so if not no yes ok have has had need want
   da ta na ne ce ko a cikin yaya yaushe wane wace me menene
   wetin how dey go fit make abeg una dem`.split(/\s+/),
)

const SYNONYMS: Record<string, string> = {
  anemia: 'anaemia',
  anemic: 'anaemia',
  anaemic: 'anaemia',
  immunisation: 'vaccine',
  immunization: 'vaccine',
  vaccination: 'vaccine',
  jab: 'vaccine',
  injection: 'vaccine',
  rigakafi: 'vaccine',
  pikin: 'baby',
  jariri: 'baby',
  breastfeeding: 'breastfeed',
}

const HOOKED: Record<string, string> = { 'ƙ': 'k', 'ɗ': 'd', 'ɓ': 'b', 'ƴ': 'y' }

function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.length > 4 && word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

export function tokenize(text: string): string[] {
  const folded = text
    .toLowerCase()
    .replace(/[ƙɗɓƴ]/g, (c) => HOOKED[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
  const out: string[] = []
  for (const raw of folded.split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue
    const s = stem(raw)
    out.push(SYNONYMS[s] ?? SYNONYMS[raw] ?? s)
  }
  return out
}

const MIN_SCORE = 2
const MAX_CARDS = 3

/** Keyword-ranks guides against a question: title hits count most, body hits least. */
export function rankGuides(query: string, guides: SearchableGuide[], limit = MAX_CARDS): OfflineCard[] {
  const queryTokens = [...new Set(tokenize(query))]
  if (queryTokens.length === 0) return []

  const scored = guides.map((g) => {
    const title = new Set(tokenize(g.title))
    const mid = new Set(tokenize(`${g.summary} ${g.keyTakeaways.join(' ')}`))
    const body = new Set(tokenize(`${g.content} ${g.warning ?? ''}`))
    let score = 0
    for (const tok of queryTokens) {
      if (title.has(tok)) score += 3
      else if (mid.has(tok)) score += 2
      else if (body.has(tok)) score += 1
    }
    return { g, score }
  })

  const top = Math.max(0, ...scored.map((s) => s.score))
  if (top < MIN_SCORE) return []
  return scored
    .filter((s) => s.score >= Math.max(MIN_SCORE, top * 0.4))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ g, score }) => ({
      slug: g.slug,
      category: g.category,
      title: g.title,
      summary: g.summary,
      takeaways: g.keyTakeaways,
      warning: g.warning,
      score,
    }))
}

function seedGuides(language: Language): SearchableGuide[] {
  return SEED_GUIDES.map((g) => ({ slug: g.slug, category: g.category, ...g.translations[language] }))
}

async function localGuides(language: Language): Promise<SearchableGuide[]> {
  try {
    const rows = await db.guides.where('language').equals(language).toArray()
    if (rows.length > 0) return rows
  } catch {
    // IndexedDB unavailable (e.g. private mode): fall through to the bundled copy.
  }
  return seedGuides(language)
}

/**
 * Offline answer: looks through the guides saved on this device (Dexie), falling back to the
 * copy bundled in the app. If nothing matches in the user's language, English is tried too.
 */
export async function searchOfflineGuidance(query: string, language: Language): Promise<OfflineCard[]> {
  const cards = rankGuides(query, await localGuides(language))
  if (cards.length > 0 || language === 'en') return cards
  return rankGuides(query, await localGuides('en'))
}

import { SEED_GUIDES } from '../data/guides.seed'
import { LANGUAGES } from '../i18n/languages'
import { db, getPreference } from './db'
import type { Guide } from './db'

/** Bump this whenever the bundled guide content changes. */
const SEED_VERSION = '2026-10-28.1'
const SEED_VERSION_KEY = 'guidesSeedVersion'

export const guideId = (slug: string, language: string) => `${slug}:${language}`

function buildRows(readSlugs: Set<string>): Guide[] {
  return SEED_GUIDES.flatMap((g) =>
    LANGUAGES.map(({ id: language }) => {
      const tr = g.translations[language]
      return {
        id: guideId(g.slug, language),
        slug: g.slug,
        category: g.category,
        stage: g.stage,
        title: tr.title,
        summary: tr.summary,
        content: tr.content,
        keyTakeaways: tr.keyTakeaways,
        warning: tr.warning,
        language,
        isRead: readSlugs.has(g.slug),
      }
    }),
  )
}

/** Fills IndexedDB with the bundled guides on first run or when content changes. Read state is preserved. */
export async function seedGuides(): Promise<void> {
  const [version, count] = await Promise.all([getPreference<string>(SEED_VERSION_KEY), db.guides.count()])
  if (version === SEED_VERSION && count === SEED_GUIDES.length * LANGUAGES.length) return

  const readSlugs = new Set((await db.guides.filter((g) => g.isRead).toArray()).map((g) => g.slug))
  await db.transaction('rw', db.guides, db.userPreferences, async () => {
    await db.guides.clear()
    await db.guides.bulkPut(buildRows(readSlugs))
    await db.userPreferences.put({ key: SEED_VERSION_KEY, value: SEED_VERSION })
  })
}

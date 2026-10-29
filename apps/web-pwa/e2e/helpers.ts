import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Opens the app and waits until the guides have been seeded into IndexedDB. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MamaCare AI', level: 1 })).toBeVisible()
  await expect
    .poll(() => readDb(page).then((d) => d?.guides ?? 0), { message: 'guides should be seeded' })
    .toBeGreaterThan(0)
}

export interface RawDb {
  names: string[]
  appointments: Record<string, unknown>[]
  preferences: { key: string; value: unknown }[]
  guides: number
}

/** Reads IndexedDB directly (bypassing the app), so tests see exactly what is stored on disk. */
export async function readDb(page: Page): Promise<RawDb | null> {
  // The page can navigate (reload after wipe, service-worker takeover) while we read: retry on that race only.
  for (let attempt = 0; ; attempt++) {
    try {
      return await readDbOnce(page)
    } catch (err) {
      if (attempt >= 10 || !/context was destroyed|navigation/i.test(String(err))) throw err
      await page.waitForLoadState('load').catch(() => undefined)
      await page.waitForTimeout(200)
    }
  }
}

async function readDbOnce(page: Page): Promise<RawDb | null> {
  return page.evaluate(async () => {
    const names = ((await indexedDB.databases()).map((d) => d.name) as (string | undefined)[]).filter((n): n is string => !!n)
    if (!names.includes('mamacare-ai')) return { names, appointments: [], preferences: [], guides: 0 }
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('mamacare-ai')
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const all = (store: string) =>
      new Promise<unknown[]>((res) => {
        if (!db.objectStoreNames.contains(store)) return res([])
        const q = db.transaction(store).objectStore(store).getAll()
        q.onsuccess = () => res(q.result)
      })
    const out = {
      names,
      appointments: (await all('appointments')) as Record<string, unknown>[],
      preferences: (await all('userPreferences')) as { key: string; value: unknown }[],
      guides: (await all('guides')).length,
    }
    db.close()
    return out
  })
}

export async function goTab(page: Page, name: RegExp | string): Promise<void> {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name }).click()
}

/** Counts POSTs to the RAG backend so tests can prove nothing was transmitted. */
export function trackChatRequests(page: Page): { count: () => number } {
  let n = 0
  page.on('request', (r) => {
    if (r.url().includes('/api/chat')) n++
  })
  return { count: () => n }
}

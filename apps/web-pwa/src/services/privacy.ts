/**
 * NDPA data-subject rights: access / portability (export) and erasure (delete everything),
 * plus a storage audit. Everything here works on this device only - nothing is uploaded.
 */
import Dexie from 'dexie'
import { fieldCrypto, isEncrypted } from './crypto'
import { db, decryptAppointment, getPreference } from './db'
import type { Appointment, UserPreference } from './db'
import { disableReminders } from './notifications'

export const EXPORT_SCHEMA = 'mamacare-export/1'
const DB_NAME = 'mamacare-ai'

export interface DataExport {
  app: 'MamaCare AI'
  schema: typeof EXPORT_SCHEMA
  exportedAt: string
  note: string
  appointments: Appointment[]
  preferences: UserPreference[]
  guideProgress: { readGuides: string[] }
}

/** Everything the app stores about the user, decrypted, as a plain object. */
export async function buildExport(now: Date = new Date()): Promise<DataExport> {
  const [appointments, preferences, readRows] = await Promise.all([
    db.appointments.toArray(),
    db.userPreferences.toArray(),
    db.guides.filter((g) => g.isRead).toArray(),
  ])
  const decryptedPrefs: UserPreference[] = await Promise.all(
    preferences.map(async (p) => ({
      key: p.key,
      value: isEncrypted(p.value) ? await fieldCrypto.decrypt(p.value, `pref:${p.key}`) : p.value,
    })),
  )
  return {
    app: 'MamaCare AI',
    schema: EXPORT_SCHEMA,
    exportedAt: now.toISOString(),
    note: 'This file contains your personal data from this device, unencrypted. Keep it private.',
    appointments: await Promise.all(appointments.map(decryptAppointment)),
    preferences: decryptedPrefs,
    guideProgress: { readGuides: [...new Set(readRows.map((g) => g.slug))].sort() },
  }
}

export function exportFileName(now: Date = new Date()): string {
  return `mamacare-data-export-${now.toISOString().slice(0, 10)}.json`
}

/** Triggers a browser download of `data` as pretty-printed JSON. */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------------------
// Storage audit

export interface StorageAudit {
  appointments: { count: number; bytes: number }
  preferences: { count: number; bytes: number }
  guides: { count: number; bytes: number }
  localStorageBytes: number
  /** Browser's estimate for this whole origin (data + offline app files); null if unsupported. */
  totalUsageBytes: number | null
  quotaBytes: number | null
}

const byteLength = (value: unknown) => new TextEncoder().encode(JSON.stringify(value) ?? '').length

function localStorageBytes(): number {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      total += byteLength(key) + byteLength(localStorage.getItem(key))
    }
    return total
  } catch {
    return 0
  }
}

export async function getStorageAudit(): Promise<StorageAudit> {
  const [appointments, preferences, guides] = await Promise.all([
    db.appointments.toArray(),
    db.userPreferences.toArray(),
    db.guides.toArray(),
  ])
  let totalUsageBytes: number | null = null
  let quotaBytes: number | null = null
  try {
    const est = await navigator.storage?.estimate?.()
    if (est) {
      totalUsageBytes = est.usage ?? null
      quotaBytes = est.quota ?? null
    }
  } catch {
    // not supported
  }
  return {
    appointments: { count: appointments.length, bytes: byteLength(appointments) },
    preferences: { count: preferences.length, bytes: byteLength(preferences) },
    guides: { count: guides.length, bytes: byteLength(guides) },
    localStorageBytes: localStorageBytes(),
    totalUsageBytes,
    quotaBytes,
  }
}

export const toKB = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

// ---------------------------------------------------------------------------
// Erasure

async function closeShownNotifications(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    const shown = (await reg?.getNotifications?.()) ?? []
    shown.forEach((n) => n.close())
  } catch {
    // ignore
  }
}

/**
 * "Delete All My Data": stops reminders and closes shown notifications, deletes the whole
 * IndexedDB database (guides, appointments, userPreferences), destroys the encryption key,
 * and clears localStorage / sessionStorage. Throws if the database could not be deleted.
 * The caller should reload the page afterwards; guides are re-seeded from the app bundle.
 */
export async function wipeAllData(): Promise<void> {
  // 1. Stop local reminders first (best effort; the database is deleted below anyway).
  try {
    if ((await getPreference<boolean>('notifications.enabled')) === true) await disableReminders()
  } catch {
    // ignore
  }
  await closeShownNotifications()

  // 2. Delete the data and the key that protects it.
  db.close()
  await Dexie.delete(DB_NAME)
  await fieldCrypto.destroyKey()

  // 3. Web storage.
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    // storage may be blocked
  }
}

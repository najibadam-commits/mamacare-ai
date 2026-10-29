import Dexie from 'dexie'
import type { EntityTable } from 'dexie'
import type { GuideCategory, StageId } from '../data/stages'
import type { Language } from '../i18n/languages'
import { fieldCrypto, isEncrypted } from './crypto'

/** One row per guide *per language* (id = `${slug}:${language}`). */
export interface Guide {
  id: string
  /** Language-independent identifier shared by all translations of a guide. */
  slug: string
  category: GuideCategory
  stage: StageId
  title: string
  summary: string
  /** Lightweight markup: "## Heading", "- bullet" lines, and plain paragraphs. */
  content: string
  keyTakeaways: string[]
  /** If present, shown as an urgent warning banner in the reader. */
  warning?: string
  language: Language
  isRead: boolean
}

export interface UserPreference {
  key: string
  value: unknown
}

export type AppointmentType = 'antenatal' | 'postnatal' | 'immunization' | 'general'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'
/** Minutes before the appointment; 0 = no reminder. */
export type ReminderOffset = 0 | 30 | 120 | 1440

export const APPOINTMENT_TYPES: AppointmentType[] = ['antenatal', 'postnatal', 'immunization', 'general']
export const REMINDER_OFFSETS: ReminderOffset[] = [0, 1440, 120, 30]

export interface Appointment {
  id?: number
  /** Optional user-entered title; the UI falls back to a localised label for the type. */
  title: string
  appointmentType: AppointmentType
  /** Local calendar date, YYYY-MM-DD */
  date: string
  /** Local time, HH:mm (24h) */
  time: string
  facilityName: string
  notes: string
  reminderEnabled: boolean
  reminderOffsetMinutes: number
  status: AppointmentStatus
  /** Epoch milliseconds */
  createdAt: number
}

export type NewAppointment = Pick<
  Appointment,
  'title' | 'appointmentType' | 'date' | 'time' | 'facilityName' | 'notes' | 'reminderOffsetMinutes'
>

class MamaCareDB extends Dexie {
  guides!: EntityTable<Guide, 'id'>
  userPreferences!: EntityTable<UserPreference, 'key'>
  appointments!: EntityTable<Appointment, 'id'>

  constructor() {
    super('mamacare-ai')
    this.version(1).stores({
      // Only indexed fields are listed; other properties are stored too.
      guides: 'id, slug, category, stage, language, [language+stage]',
      userPreferences: 'key',
    })
    // v2: appointments (all data stays in this browser's IndexedDB; nothing is synced anywhere)
    this.version(2).stores({
      appointments:
        '++id, title, appointmentType, date, time, facilityName, notes, reminderEnabled, reminderOffsetMinutes, status, createdAt',
    })
  }
}

export const db = new MamaCareDB()

export async function getPreference<T = unknown>(key: string): Promise<T | undefined> {
  const row = await db.userPreferences.get(key)
  return row?.value as T | undefined
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  await db.userPreferences.put({ key, value })
}

/** Mark a guide (in every language) as read. */
export async function markGuideRead(slug: string): Promise<void> {
  await db.guides.where('slug').equals(slug).modify({ isRead: true })
}

// ---------------------------------------------------------------------------
// Appointments

export function appointmentStartMs(a: Pick<Appointment, 'date' | 'time'>): number {
  const [y, m, d] = a.date.split('-').map(Number)
  const [h, min] = a.time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min).getTime()
}

/** `notes` is stored encrypted (AES-GCM, see crypto.ts); every read path below decrypts it. */
const NOTES_CONTEXT = 'appointment.notes'

export async function decryptAppointment(a: Appointment): Promise<Appointment> {
  return isEncrypted(a.notes) ? { ...a, notes: await fieldCrypto.decrypt(a.notes, NOTES_CONTEXT) } : a
}

const byStartAsc = (a: Appointment, b: Appointment) => appointmentStartMs(a) - appointmentStartMs(b)

/** Scheduled appointments that have not started yet, soonest first. */
export async function getUpcomingAppointments(now: Date = new Date()): Promise<Appointment[]> {
  const scheduled = await db.appointments.where('status').equals('scheduled').toArray()
  const upcoming = scheduled.filter((a) => appointmentStartMs(a) >= now.getTime()).sort(byStartAsc)
  return Promise.all(upcoming.map(decryptAppointment))
}

/** Completed, cancelled, or scheduled-but-already-passed appointments, most recent first. */
export async function getPastAppointments(now: Date = new Date()): Promise<Appointment[]> {
  const all = await db.appointments.toArray()
  const past = all
    .filter((a) => a.status !== 'scheduled' || appointmentStartMs(a) < now.getTime())
    .sort((a, b) => byStartAsc(b, a))
  return Promise.all(past.map(decryptAppointment))
}

export async function createAppointment(input: NewAppointment): Promise<number> {
  const notes = await fieldCrypto.encrypt(input.notes.trim(), NOTES_CONTEXT)
  const id = await db.appointments.add({
    ...input,
    title: input.title.trim(),
    facilityName: input.facilityName.trim(),
    notes,
    reminderEnabled: input.reminderOffsetMinutes > 0,
    status: 'scheduled',
    createdAt: Date.now(),
  })
  return id as number
}

export async function updateAppointment(
  id: number,
  changes: Partial<Omit<Appointment, 'id' | 'createdAt'>>,
): Promise<void> {
  const patch = { ...changes }
  if (patch.notes !== undefined) patch.notes = await fieldCrypto.encrypt(patch.notes.trim(), NOTES_CONTEXT)
  if (patch.reminderOffsetMinutes !== undefined) patch.reminderEnabled = patch.reminderOffsetMinutes > 0
  await db.appointments.update(id, patch)
}

export async function deleteAppointment(id: number): Promise<void> {
  await db.appointments.delete(id)
}

// ---------------------------------------------------------------------------
// Encrypted preferences (personal values such as the emergency contact number)

export async function getSecurePreference(key: string): Promise<string | undefined> {
  const value = await getPreference<string>(key)
  return typeof value === 'string' ? fieldCrypto.decrypt(value, `pref:${key}`) : undefined
}

export async function setSecurePreference(key: string, value: string): Promise<void> {
  await setPreference(key, await fieldCrypto.encrypt(value, `pref:${key}`))
}

/** Preference keys whose values are personal and therefore stored encrypted. */
export const SECURE_PREFERENCE_KEYS = ['emergency.contact'] as const

/**
 * One-off upgrade: encrypts any plaintext notes / personal preferences written by earlier versions.
 * Safe to run on every start (already-encrypted values are skipped). Silently does nothing if
 * encryption is unavailable.
 */
export async function encryptLegacyData(): Promise<void> {
  if (!fieldCrypto.available()) return
  const rows = await db.appointments.filter((a) => !!a.notes && !isEncrypted(a.notes)).toArray()
  for (const a of rows) {
    await db.appointments.update(a.id as number, { notes: await fieldCrypto.encrypt(a.notes, NOTES_CONTEXT) })
  }
  for (const key of SECURE_PREFERENCE_KEYS) {
    const raw = await getPreference<string>(key)
    if (typeof raw === 'string' && raw && !isEncrypted(raw)) await setSecurePreference(key, raw)
  }
}

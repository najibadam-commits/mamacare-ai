/**
 * Privacy-preserving, local-only reminders (NDPA-aligned).
 *
 * - Consent is explicit: nothing is requested or scheduled until the user accepts the consent sheet.
 * - Reminders are generated on-device from IndexedDB. No server, push service or analytics is involved.
 * - Discreet mode (default ON) never puts the title, facility, notes, visit type or any pregnancy hint
 *   in a notification - only "a health visit" and the time.
 * - Limitation: with no server there is no push, so reminders fire while the app is open (even in a
 *   background tab) or the next time it is opened - never from a fully closed app.
 */
import type { Language } from '../i18n/languages'
import type { StringKey } from '../i18n/strings'
import { calendarDayDiff, formatDate, formatTime, parseStart } from '../lib/dates'
import { appointmentStartMs, db, getPreference, setPreference } from './db'
import type { Appointment } from './db'

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string
export interface ReminderContext {
  language: Language
  t: Translate
}
export type PermissionState = NotificationPermission | 'unsupported'

const KEY_ENABLED = 'notifications.enabled'
const KEY_DISCREET = 'notifications.discreet'
const KEY_CONSENT_AT = 'notifications.consentAt'
const KEY_FIRED = 'notifications.fired'
export const REMINDERS_CHANGED_EVENT = 'mamacare:reminders-changed'
const TICK_MS = 20_000

export const NOTIFICATION_PREF_KEYS = [KEY_ENABLED, KEY_DISCREET] as const

// ---------------------------------------------------------------------------
// Permission + settings

export function getPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export interface ReminderSettings {
  /** The user accepted the consent sheet (and has not revoked). */
  enabled: boolean
  /** Discreet Reminders; defaults to true until the user turns it off. */
  discreet: boolean
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const [enabled, discreet] = await Promise.all([getPreference<boolean>(KEY_ENABLED), getPreference<boolean>(KEY_DISCREET)])
  return { enabled: enabled === true, discreet: discreet !== false }
}

export function pokeReminderEngine(): void {
  window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT))
}

/** Call only after the user accepted the consent sheet. Asks the browser for permission. */
export async function enableReminders(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  let permission: NotificationPermission = Notification.permission
  if (permission === 'default') permission = await Notification.requestPermission()
  if (permission === 'granted') {
    await setPreference(KEY_ENABLED, true)
    await setPreference(KEY_CONSENT_AT, new Date().toISOString())
    pokeReminderEngine()
  }
  return permission
}

/** One-click revoke: stop reminders, forget consent, clear pending state and any shown notifications. */
export async function disableReminders(): Promise<void> {
  await setPreference(KEY_ENABLED, false)
  await db.userPreferences.delete(KEY_CONSENT_AT)
  await db.userPreferences.delete(KEY_FIRED)
  try {
    const reg = await getRegistration()
    const shown = (await reg?.getNotifications()) ?? []
    shown.forEach((n) => n.close())
  } catch {
    /* best effort */
  }
  pokeReminderEngine()
}

export async function setDiscreet(on: boolean): Promise<void> {
  await setPreference(KEY_DISCREET, on)
}

// ---------------------------------------------------------------------------
// Payloads

export interface ReminderPayload {
  title: string
  body: string
  tag: string
  icon?: string
}

function whenText(start: Date, now: Date, ctx: ReminderContext, discreet: boolean): string {
  const time = formatTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`, ctx.language)
  const diff = calendarDayDiff(start, now)
  const dateStr = formatDate(
    `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    ctx.language,
  )
  if (discreet) {
    if (diff <= 0) return ctx.t('notif.discreetToday', { time })
    if (diff === 1) return ctx.t('notif.discreetTomorrow', { time })
    return ctx.t('notif.discreetOnDate', { date: dateStr, time })
  }
  if (diff <= 0) return ctx.t('notif.fullToday', { time })
  if (diff === 1) return ctx.t('notif.fullTomorrow', { time })
  return ctx.t('notif.fullOnDate', { date: dateStr, time })
}

/**
 * Discreet ON: generic title/body, no icon, nothing from the appointment except the time.
 * Discreet OFF: appointment title (or localised type label) plus facility name.
 */
export function buildReminderPayload(
  appt: Appointment,
  opts: { discreet: boolean; now: Date } & ReminderContext,
): ReminderPayload {
  const { discreet, now, language, t } = opts
  const start = parseStart(appt.date, appt.time)
  const when = whenText(start, now, { language, t }, discreet)
  const tag = `reminder-${appt.id}`
  if (discreet) return { title: t('notif.discreetTitle'), body: when, tag }

  const title = appt.title || t(`appt.defaultTitle.${appt.appointmentType}`)
  const body = appt.facilityName ? `${when} · ${appt.facilityName}` : when
  return { title, body, tag, icon: '/pwa-192x192.png' }
}

// ---------------------------------------------------------------------------
// Display

async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  try {
    return await navigator.serviceWorker.getRegistration()
  } catch {
    return undefined
  }
}

async function display(payload: ReminderPayload, language: Language): Promise<void> {
  const options: NotificationOptions = { body: payload.body, tag: payload.tag, lang: language }
  if (payload.icon) options.icon = payload.icon
  const reg = await getRegistration()
  if (reg) await reg.showNotification(payload.title, options)
  else new Notification(payload.title, options)
}

export async function sendTestReminder(ctx: ReminderContext): Promise<boolean> {
  if (getPermission() !== 'granted') return false
  const { discreet } = await getReminderSettings()
  await display(
    {
      title: discreet ? ctx.t('notif.discreetTitle') : 'MamaCare AI',
      body: ctx.t('notif.testBody'),
      tag: 'reminder-test',
      icon: discreet ? undefined : '/pwa-192x192.png',
    },
    ctx.language,
  )
  return true
}

// ---------------------------------------------------------------------------
// Engine

const firedKey = (a: Appointment) => `${a.id}|${a.date}|${a.time}|${a.reminderOffsetMinutes}`

/** Shows every reminder that is due and not yet shown. Returns how many were shown. */
export async function checkDueReminders(ctx: ReminderContext, now: Date = new Date()): Promise<number> {
  const settings = await getReminderSettings()
  if (!settings.enabled || getPermission() !== 'granted') return 0

  const appts = await db.appointments.where('status').equals('scheduled').toArray()
  const fired = new Set((await getPreference<string[]>(KEY_FIRED)) ?? [])
  const live = new Set<string>()
  let shown = 0

  for (const a of appts) {
    if (!a.reminderEnabled || a.reminderOffsetMinutes <= 0) continue
    const key = firedKey(a)
    live.add(key)
    const start = appointmentStartMs(a)
    const fireAt = start - a.reminderOffsetMinutes * 60_000
    if (now.getTime() >= fireAt && now.getTime() < start && !fired.has(key)) {
      fired.add(key)
      await setPreference(KEY_FIRED, [...fired]) // record first so a re-entrant tick can never duplicate
      await display(buildReminderPayload(a, { discreet: settings.discreet, now, ...ctx }), ctx.language)
      shown++
    }
  }

  const pruned = [...fired].filter((k) => live.has(k))
  if (pruned.length !== fired.size) await setPreference(KEY_FIRED, pruned)
  return shown
}

/** Starts the in-app reminder loop. Returns a stop function. */
export function startReminderEngine(getContext: () => ReminderContext): () => void {
  let stopped = false
  let running = false
  let rerun = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const run = async () => {
    if (stopped) return
    if (running) {
      rerun = true
      return
    }
    running = true
    clearTimeout(timer)
    try {
      await checkDueReminders(getContext())
    } catch (err) {
      console.error('Reminder check failed', err)
    } finally {
      running = false
      if (!stopped) {
        if (rerun) {
          rerun = false
          void run()
        } else {
          timer = setTimeout(() => void run(), TICK_MS)
        }
      }
    }
  }

  const onWake = () => {
    if (document.visibilityState !== 'hidden') void run()
  }
  window.addEventListener(REMINDERS_CHANGED_EVENT, onWake)
  window.addEventListener('focus', onWake)
  window.addEventListener('online', onWake)
  document.addEventListener('visibilitychange', onWake)
  void run()

  return () => {
    stopped = true
    clearTimeout(timer)
    window.removeEventListener(REMINDERS_CHANGED_EVENT, onWake)
    window.removeEventListener('focus', onWake)
    window.removeEventListener('online', onWake)
    document.removeEventListener('visibilitychange', onWake)
  }
}

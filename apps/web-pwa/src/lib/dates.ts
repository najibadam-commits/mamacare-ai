import type { Language } from '../i18n/languages'

const DATE_LOCALES: Record<Language, string> = { en: 'en-NG', ha: 'ha-NG', pcm: 'en-NG' }
const TIME_LOCALES: Record<Language, string> = { en: 'en-US', ha: 'en-US', pcm: 'en-US' }

const pad = (n: number) => String(n).padStart(2, '0')

/** Local YYYY-MM-DD for <input type="date"> */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function parseStart(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

function safeFormat(locales: string[], options: Intl.DateTimeFormatOptions, value: Date): string {
  for (const locale of locales) {
    try {
      return new Intl.DateTimeFormat(locale, options).format(value)
    } catch {
      /* try the next locale */
    }
  }
  return value.toDateString()
}

export function formatDate(date: string, language: Language, long = false): string {
  const options: Intl.DateTimeFormatOptions = long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
  return safeFormat([DATE_LOCALES[language], 'en-GB'], options, parseStart(date, '00:00'))
}

/** e.g. "10:00 AM" */
export function formatTime(time: string, language: Language): string {
  return safeFormat([TIME_LOCALES[language]], { hour: 'numeric', minute: '2-digit', hour12: true }, parseStart('2000-01-01', time))
}

/** Whole calendar days from `now` to `start` (0 = same day, 1 = tomorrow). */
export function calendarDayDiff(start: Date, now: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((a - b) / 86_400_000)
}

export type PeriodKind = 'yearly' | 'quarterly' | 'monthly' | 'weekly'

const UID_RE = /^[A-Za-z][A-Za-z0-9]{10}$/
const YEARLY = /^(\d{4})$/
const MONTHLY = /^(\d{4})(0[1-9]|1[0-2])$/
const QUARTERLY = /^(\d{4})Q([1-4])$/
const WEEKLY = /^(\d{4})W([1-9]|[1-4]\d|5[0-3])$/

export const isUid = (value: unknown): value is string => typeof value === 'string' && UID_RE.test(value)

export function periodKind(period: string): PeriodKind | null {
  if (YEARLY.test(period)) return 'yearly'
  if (MONTHLY.test(period)) return 'monthly'
  if (QUARTERLY.test(period)) return 'quarterly'
  if (WEEKLY.test(period)) return 'weekly'
  return null
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d))

/** Inclusive [start, end] calendar dates (YYYY-MM-DD) covered by a DHIS2 period, or null if invalid. */
export function periodToRange(period: string): { start: string; end: string } | null {
  let m: RegExpMatchArray | null
  if ((m = period.match(YEARLY))) {
    const y = Number(m[1])
    return { start: iso(utc(y, 0, 1)), end: iso(utc(y, 11, 31)) }
  }
  if ((m = period.match(MONTHLY))) {
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    return { start: iso(utc(y, mo, 1)), end: iso(utc(y, mo + 1, 0)) }
  }
  if ((m = period.match(QUARTERLY))) {
    const y = Number(m[1])
    const q = Number(m[2]) - 1
    return { start: iso(utc(y, q * 3, 1)), end: iso(utc(y, q * 3 + 3, 0)) }
  }
  if ((m = period.match(WEEKLY))) {
    // ISO 8601 week: week 1 contains 4 January; weeks start on Monday.
    const y = Number(m[1])
    const week = Number(m[2])
    const jan4 = utc(y, 0, 4)
    const mondayWeek1 = utc(y, 0, 4 - ((jan4.getUTCDay() + 6) % 7))
    const start = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86_400_000)
    return { start: iso(start), end: iso(new Date(start.getTime() + 6 * 86_400_000)) }
  }
  return null
}

import { Dhis2ValidationError } from './errors.js'
import { isUid, periodToRange } from './period.js'
import type { AggregateMetrics, AppointmentLike, TriageStats } from './types.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Counts anonymous totals for one reporting period and one organisation unit.
 *
 *  - ANC visits attended                 = completed `antenatal` appointments dated inside the period
 *  - Postnatal checkups completed        = completed `postnatal` appointments dated inside the period
 *  - Child routine immunizations logged  = completed `immunization` appointments dated inside the period
 *  - Obstetric emergency red alerts      = `triageStats.redAlerts`
 *
 * PRIVACY: only `appointmentType`, `status` and `date` are read, and only to decide whether to add
 * 1 to a counter. The returned object contains four integers plus the org unit and period; nothing
 * from an individual appointment (title, notes, facility, id, date) is carried over.
 */
export function aggregateMetrics(
  appointments: readonly AppointmentLike[],
  triageStats: TriageStats,
  orgUnitId: string,
  period: string,
): AggregateMetrics {
  const problems: string[] = []
  if (!isUid(orgUnitId)) problems.push('orgUnitId must be a DHIS2 UID (11 characters, starting with a letter)')
  const range = periodToRange(period)
  if (!range) problems.push(`period "${period}" is not a valid DHIS2 period (yyyy, yyyyMM, yyyyQn or yyyyWn)`)
  const alerts = triageStats?.redAlerts
  if (!Number.isInteger(alerts) || alerts < 0) problems.push('triageStats.redAlerts must be a non-negative integer')
  if (problems.length || !range) throw new Dhis2ValidationError(problems)

  let anc = 0
  let postnatal = 0
  let immunization = 0
  for (const a of appointments) {
    if (a.status !== 'completed') continue
    if (!DATE_RE.test(a.date) || a.date < range.start || a.date > range.end) continue
    if (a.appointmentType === 'antenatal') anc++
    else if (a.appointmentType === 'postnatal') postnatal++
    else if (a.appointmentType === 'immunization') immunization++
  }

  return {
    orgUnit: orgUnitId,
    period,
    ancVisitsAttended: anc,
    postnatalCheckupsCompleted: postnatal,
    childImmunizationsLogged: immunization,
    obstetricRedAlerts: alerts,
  }
}

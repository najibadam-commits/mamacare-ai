import { Dhis2ValidationError } from './errors.js'
import { isUid, periodKind } from './period.js'

const TOP_LEVEL_KEYS = new Set(['dataSet', 'period', 'orgUnit', 'completeDate', 'dataValues'])
const VALUE_KEYS = new Set(['dataElement', 'period', 'orgUnit', 'categoryOptionCombo', 'attributeOptionCombo', 'value'])
const COUNT_RE = /^(0|[1-9]\d{0,8})$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Strict allow-list validation of a DataValueSet. Anything not on the list (for example DHIS2's
 * free-text `comment` or `storedBy` fields, or any stray property) is rejected, so personal data
 * cannot ride along in a payload even by accident. Returns a list of problems (empty = valid).
 */
export function validateDataValueSet(payload: unknown): string[] {
  const problems: string[] = []
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ['payload must be an object']
  const p = payload as Record<string, unknown>

  for (const key of Object.keys(p)) if (!TOP_LEVEL_KEYS.has(key)) problems.push(`unexpected field "${key}"`)
  if (typeof p.period !== 'string' || !periodKind(p.period)) problems.push('period must be a valid DHIS2 period')
  if (!isUid(p.orgUnit)) problems.push('orgUnit must be a DHIS2 UID')
  if (p.dataSet !== undefined && !isUid(p.dataSet)) problems.push('dataSet must be a DHIS2 UID')
  if (p.completeDate !== undefined && !(typeof p.completeDate === 'string' && DATE_RE.test(p.completeDate))) {
    problems.push('completeDate must be YYYY-MM-DD')
  }

  if (!Array.isArray(p.dataValues) || p.dataValues.length === 0) {
    problems.push('dataValues must be a non-empty array')
    return problems
  }
  p.dataValues.forEach((dv: unknown, i: number) => {
    if (!dv || typeof dv !== 'object' || Array.isArray(dv)) return problems.push(`dataValues[${i}] must be an object`)
    const v = dv as Record<string, unknown>
    for (const key of Object.keys(v)) if (!VALUE_KEYS.has(key)) problems.push(`dataValues[${i}]: unexpected field "${key}"`)
    if (!isUid(v.dataElement)) problems.push(`dataValues[${i}].dataElement must be a DHIS2 UID`)
    for (const k of ['categoryOptionCombo', 'attributeOptionCombo', 'orgUnit'] as const) {
      if (v[k] !== undefined && !isUid(v[k])) problems.push(`dataValues[${i}].${k} must be a DHIS2 UID`)
    }
    if (v.period !== undefined && !(typeof v.period === 'string' && periodKind(v.period))) problems.push(`dataValues[${i}].period is invalid`)
    if (typeof v.value !== 'string' || !COUNT_RE.test(v.value)) problems.push(`dataValues[${i}].value must be a count as a string of digits`)
  })
  return problems
}

export function assertValidDataValueSet(payload: unknown): asserts payload is import('./types.js').DataValueSet {
  const problems = validateDataValueSet(payload)
  if (problems.length) throw new Dhis2ValidationError(problems)
}

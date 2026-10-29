import { Dhis2ValidationError } from './errors.js'
import { isUid } from './period.js'
import { assertValidDataValueSet } from './validate.js'
import type { AggregateMetrics, BuildOptions, DataValue, DataValueSet, IndicatorMapping, MetricKey } from './types.js'

const METRIC_KEYS: MetricKey[] = ['ancVisitsAttended', 'postnatalCheckupsCompleted', 'childImmunizationsLogged', 'obstetricRedAlerts']

/**
 * Builds the JSON body for `POST /api/dataValueSets`: period and orgUnit once at the top, then one
 * `{ dataElement, [categoryOptionCombo], value }` entry per metric. The result is validated against
 * the strict allow-list before it is returned, so it is safe to send as-is.
 */
export function buildDataValueSet(metrics: AggregateMetrics, mapping: IndicatorMapping, options: BuildOptions = {}): DataValueSet {
  const problems: string[] = []
  for (const key of METRIC_KEYS) if (!isUid(mapping.dataElements?.[key])) problems.push(`mapping.dataElements.${key} must be a DHIS2 UID`)
  for (const key of ['categoryOptionCombo', 'attributeOptionCombo', 'dataSet'] as const) {
    if (mapping[key] !== undefined && !isUid(mapping[key])) problems.push(`mapping.${key} must be a DHIS2 UID`)
  }
  if (problems.length) throw new Dhis2ValidationError(problems)

  const threshold = options.suppressBelow ?? 0
  const dataValues: DataValue[] = []
  for (const key of METRIC_KEYS) {
    const count = metrics[key]
    if (count > 0 && count < threshold) continue // small-cell suppression
    dataValues.push({
      dataElement: mapping.dataElements[key],
      ...(mapping.categoryOptionCombo ? { categoryOptionCombo: mapping.categoryOptionCombo } : {}),
      value: String(count),
    })
  }

  const payload: DataValueSet = {
    ...(mapping.dataSet ? { dataSet: mapping.dataSet } : {}),
    ...(options.completeDate ? { completeDate: options.completeDate } : {}),
    period: metrics.period,
    orgUnit: metrics.orgUnit,
    dataValues,
  }
  assertValidDataValueSet(payload)
  return payload
}

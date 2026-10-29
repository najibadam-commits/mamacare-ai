/** DHIS2 identifiers ("UIDs"): 11 characters, a letter followed by 10 letters/digits. */
export type Uid = string

/**
 * One value in a DHIS2 DataValueSet (Web API: POST /api/dataValueSets, JSON format).
 * DHIS2 itself also accepts `comment`, `storedBy` etc.; this connector deliberately never emits
 * them, because free text is where personal data leaks.
 */
export interface DataValue {
  dataElement: Uid
  /** Period ISO string; usually set once on the DataValueSet instead. */
  period?: string
  /** Usually set once on the DataValueSet instead. */
  orgUnit?: Uid
  categoryOptionCombo?: Uid
  attributeOptionCombo?: Uid
  /** DHIS2 transports every value as a string. Here: a non-negative integer. */
  value: string
}

export interface DataValueSet {
  dataSet?: Uid
  /** DHIS2 period, e.g. 202610 (month), 2026Q4, 2026W43, 2026. */
  period: string
  orgUnit: Uid
  /** ISO date (YYYY-MM-DD) the report was completed. Optional. */
  completeDate?: string
  dataValues: DataValue[]
}

export type AppointmentType = 'antenatal' | 'postnatal' | 'immunization' | 'general'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

/**
 * The only three fields the aggregator reads from an appointment. Objects with more fields
 * (title, notes, facility, ...) can be passed in, but those fields are never read or copied.
 */
export interface AppointmentLike {
  appointmentType: AppointmentType
  status: AppointmentStatus
  /** Local calendar date, YYYY-MM-DD. */
  date: string
}

/** Pre-aggregated triage counters supplied by the app (no symptom text, no timestamps). */
export interface TriageStats {
  /** Obstetric-emergency red alerts triggered within the reporting period. */
  redAlerts: number
}

export interface AggregateMetrics {
  orgUnit: Uid
  period: string
  ancVisitsAttended: number
  postnatalCheckupsCompleted: number
  childImmunizationsLogged: number
  obstetricRedAlerts: number
}

export type MetricKey = 'ancVisitsAttended' | 'postnatalCheckupsCompleted' | 'childImmunizationsLogged' | 'obstetricRedAlerts'

/**
 * Maps MamaCare metrics onto the data elements of YOUR DHIS2 instance. Each State PHCDA / NHMIS
 * deployment has its own UIDs, so there are deliberately no built-in defaults.
 */
export interface IndicatorMapping {
  dataElements: Record<MetricKey, Uid>
  categoryOptionCombo?: Uid
  attributeOptionCombo?: Uid
  dataSet?: Uid
}

export interface BuildOptions {
  /**
   * Small-cell suppression: counts greater than 0 but below this number are omitted from the payload.
   * Default 0 (off). Use it when reports could describe very few people.
   */
  suppressBelow?: number
  completeDate?: string
}

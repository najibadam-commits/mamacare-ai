import { describe, expect, it, vi } from 'vitest'
import {
  Dhis2RequestError,
  Dhis2ValidationError,
  aggregateMetrics,
  buildDataValueSet,
  periodToRange,
  submitDataValueSet,
  validateDataValueSet,
} from '../src/index.js'
import type { AppointmentLike, IndicatorMapping } from '../src/index.js'

// Syntactically valid but FAKE UIDs - real ones come from your DHIS2 instance.
const ORG = 'Ab1Cd2Ef3Gh'
const MAPPING: IndicatorMapping = {
  dataElements: {
    ancVisitsAttended: 'deAncVisit1',
    postnatalCheckupsCompleted: 'dePostnatl2',
    childImmunizationsLogged: 'deImmunize3',
    obstetricRedAlerts: 'deRedAlert4',
  },
  categoryOptionCombo: 'cocDefault1',
  dataSet: 'dsMamaCare1',
}

const appt = (appointmentType: AppointmentLike['appointmentType'], date: string, status: AppointmentLike['status'] = 'completed'): AppointmentLike => ({
  appointmentType,
  date,
  status,
})

const SAMPLE: AppointmentLike[] = [
  appt('antenatal', '2026-10-05'),
  appt('antenatal', '2026-10-31'),
  appt('antenatal', '2026-10-12', 'scheduled'),
  appt('antenatal', '2026-10-13', 'cancelled'),
  appt('antenatal', '2026-09-30'), // previous month
  appt('antenatal', '2026-11-01'), // next month
  appt('postnatal', '2026-10-01'),
  appt('immunization', '2026-10-20'),
  appt('immunization', '2026-10-21'),
  appt('immunization', '2026-10-22'),
  appt('general', '2026-10-15'),
]

describe('periodToRange', () => {
  it.each([
    ['202610', '2026-10-01', '2026-10-31'],
    ['202602', '2026-02-01', '2026-02-28'],
    ['202402', '2024-02-01', '2024-02-29'],
    ['2026Q4', '2026-10-01', '2026-12-31'],
    ['2026', '2026-01-01', '2026-12-31'],
    ['2026W1', '2025-12-29', '2026-01-04'],
    ['2026W43', '2026-10-19', '2026-10-25'],
  ])('%s -> %s .. %s', (period, start, end) => {
    expect(periodToRange(period)).toEqual({ start, end })
  })
  it.each(['', '2026-10', '202613', '2026Q5', '2026W54', '26', 'October'])('rejects %s', (p) => {
    expect(periodToRange(p)).toBeNull()
  })
})

describe('aggregateMetrics', () => {
  it('counts only completed visits of each type inside the period', () => {
    expect(aggregateMetrics(SAMPLE, { redAlerts: 2 }, ORG, '202610')).toEqual({
      orgUnit: ORG,
      period: '202610',
      ancVisitsAttended: 2,
      postnatalCheckupsCompleted: 1,
      childImmunizationsLogged: 3,
      obstetricRedAlerts: 2,
    })
  })
  it('works for quarterly and yearly periods', () => {
    expect(aggregateMetrics(SAMPLE, { redAlerts: 0 }, ORG, '2026Q4').ancVisitsAttended).toBe(3) // Oct 5, Oct 31 and Nov 1
    expect(aggregateMetrics(SAMPLE, { redAlerts: 0 }, ORG, '2026').ancVisitsAttended).toBe(4)
  })
  it('returns zeros for an empty history', () => {
    const m = aggregateMetrics([], { redAlerts: 0 }, ORG, '202610')
    expect([m.ancVisitsAttended, m.postnatalCheckupsCompleted, m.childImmunizationsLogged, m.obstetricRedAlerts]).toEqual([0, 0, 0, 0])
  })
  it('rejects bad org units, periods and counters', () => {
    expect(() => aggregateMetrics([], { redAlerts: 0 }, 'short', '202610')).toThrow(Dhis2ValidationError)
    expect(() => aggregateMetrics([], { redAlerts: 0 }, '1bcdefghijk', '202610')).toThrow(Dhis2ValidationError)
    expect(() => aggregateMetrics([], { redAlerts: 0 }, ORG, '2026-10')).toThrow(Dhis2ValidationError)
    expect(() => aggregateMetrics([], { redAlerts: -1 }, ORG, '202610')).toThrow(Dhis2ValidationError)
    expect(() => aggregateMetrics([], { redAlerts: 1.5 }, ORG, '202610')).toThrow(Dhis2ValidationError)
  })
  it('ignores malformed dates instead of crashing', () => {
    expect(aggregateMetrics([appt('antenatal', 'tomorrow')], { redAlerts: 0 }, ORG, '202610').ancVisitsAttended).toBe(0)
  })
})

describe('DataValueSet payload (POST /api/dataValueSets)', () => {
  const metrics = aggregateMetrics(SAMPLE, { redAlerts: 2 }, ORG, '202610')

  it('matches the DHIS2 Web API shape exactly', () => {
    expect(buildDataValueSet(metrics, MAPPING, { completeDate: '2026-11-02' })).toEqual({
      dataSet: 'dsMamaCare1',
      completeDate: '2026-11-02',
      period: '202610',
      orgUnit: ORG,
      dataValues: [
        { dataElement: 'deAncVisit1', categoryOptionCombo: 'cocDefault1', value: '2' },
        { dataElement: 'dePostnatl2', categoryOptionCombo: 'cocDefault1', value: '1' },
        { dataElement: 'deImmunize3', categoryOptionCombo: 'cocDefault1', value: '3' },
        { dataElement: 'deRedAlert4', categoryOptionCombo: 'cocDefault1', value: '2' },
      ],
    })
  })
  it('emits values as strings and passes its own validator', () => {
    const payload = buildDataValueSet(metrics, MAPPING)
    expect(payload.dataValues.every((v) => typeof v.value === 'string')).toBe(true)
    expect(validateDataValueSet(payload)).toEqual([])
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
  })
  it('requires a UID mapping for every metric', () => {
    const bad = { ...MAPPING, dataElements: { ...MAPPING.dataElements, obstetricRedAlerts: 'nope' } }
    expect(() => buildDataValueSet(metrics, bad)).toThrow(Dhis2ValidationError)
  })
  it('suppresses small non-zero cells when asked', () => {
    const payload = buildDataValueSet(metrics, MAPPING, { suppressBelow: 3 })
    expect(payload.dataValues.map((v) => v.dataElement)).toEqual(['deImmunize3']) // 2, 1, 2 hidden; 3 kept
    const zero = aggregateMetrics([], { redAlerts: 0 }, ORG, '202610')
    expect(buildDataValueSet(zero, MAPPING, { suppressBelow: 5 }).dataValues).toHaveLength(4) // zeros are not suppressed
  })

  describe('validator', () => {
    const good = () => buildDataValueSet(metrics, MAPPING)
    it.each([
      ['bad period', (p: Record<string, unknown>) => (p.period = '2026-10')],
      ['bad orgUnit', (p: Record<string, unknown>) => (p.orgUnit = 'x')],
      ['empty dataValues', (p: Record<string, unknown>) => (p.dataValues = [])],
      ['unknown top-level field', (p: Record<string, unknown>) => (p.patientName = 'x')],
      ['numeric (non-string) value', (p: Record<string, unknown>) => ((p.dataValues as Record<string, unknown>[])[0]!.value = 2)],
      ['negative value', (p: Record<string, unknown>) => ((p.dataValues as Record<string, unknown>[])[0]!.value = '-1')],
      ['text value', (p: Record<string, unknown>) => ((p.dataValues as Record<string, unknown>[])[0]!.value = 'Amina')],
      ['DHIS2 free-text comment', (p: Record<string, unknown>) => ((p.dataValues as Record<string, unknown>[])[0]!.comment = 'note')],
      ['storedBy', (p: Record<string, unknown>) => ((p.dataValues as Record<string, unknown>[])[0]!.storedBy = 'me')],
    ])('rejects %s', (_name, mutate) => {
      const p = JSON.parse(JSON.stringify(good())) as Record<string, unknown>
      mutate(p)
      expect(validateDataValueSet(p).length).toBeGreaterThan(0)
    })
    it('rejects non-objects', () => {
      expect(validateDataValueSet(null)).not.toEqual([])
      expect(validateDataValueSet([])).not.toEqual([])
    })
  })
})

describe('ZERO PII in the aggregate payload', () => {
  // Full app-style appointment rows loaded with identifying data.
  const PII = {
    title: 'Amina Yusuf antenatal',
    facilityName: 'Gwarzo General Hospital',
    notes: 'Amina Yusuf, DOB 1995-03-14, phone 08031234567, HIV positive',
    patientName: 'Amina Yusuf',
    dateOfBirth: '1995-03-14',
    phone: '08031234567',
    id: 424242,
    createdAt: 1_761_000_000_000,
  }
  const rich = [
    { ...PII, appointmentType: 'antenatal' as const, status: 'completed' as const, date: '2026-10-05' },
    { ...PII, appointmentType: 'immunization' as const, status: 'completed' as const, date: '2026-10-17' },
    { ...PII, appointmentType: 'postnatal' as const, status: 'completed' as const, date: '2026-10-29' },
  ]
  const metrics = aggregateMetrics(rich, { redAlerts: 1 }, ORG, '202610')
  const payload = buildDataValueSet(metrics, MAPPING, { completeDate: '2026-11-01' })
  const json = JSON.stringify(payload)

  it('contains none of the identifying strings', () => {
    for (const secret of ['Amina', 'Yusuf', 'Gwarzo', '1995', '08031234567', 'HIV', '424242', '1761000000000', 'antenatal', 'phone', 'notes']) {
      expect(json, secret).not.toContain(secret)
    }
  })
  it('contains none of the appointment dates', () => {
    for (const d of ['2026-10-05', '2026-10-17', '2026-10-29']) expect(json).not.toContain(d)
  })
  it('metrics object holds only counts, org unit and period', () => {
    expect(Object.keys(metrics).sort()).toEqual(
      ['ancVisitsAttended', 'childImmunizationsLogged', 'obstetricRedAlerts', 'orgUnit', 'period', 'postnatalCheckupsCompleted'].sort(),
    )
  })
  it('only allow-listed keys appear anywhere in the payload', () => {
    const allowedTop = ['completeDate', 'dataSet', 'dataValues', 'orgUnit', 'period']
    expect(Object.keys(payload).every((k) => allowedTop.includes(k))).toBe(true)
    const allowedValue = ['categoryOptionCombo', 'dataElement', 'value']
    for (const dv of payload.dataValues) expect(Object.keys(dv).every((k) => allowedValue.includes(k))).toBe(true)
  })
  it('every string in the payload is a UID, period, date or digit string', () => {
    const strings: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    walk(payload)
    const ok = /^([A-Za-z][A-Za-z0-9]{10}|\d{6}|\d{4}-\d{2}-\d{2}|\d+)$/
    expect(strings.filter((s) => !ok.test(s))).toEqual([])
  })
  it('the validator blocks a payload that has been tampered with to include PII', () => {
    const tampered = { ...payload, dataValues: [{ ...payload.dataValues[0]!, comment: 'Amina Yusuf' }] }
    expect(validateDataValueSet(tampered).length).toBeGreaterThan(0)
  })
})

describe('submitDataValueSet', () => {
  const payload = buildDataValueSet(aggregateMetrics(SAMPLE, { redAlerts: 1 }, ORG, '202610'), MAPPING)

  it('POSTs JSON to /api/dataValueSets with auth, dryRun and strategy', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: 'SUCCESS' }), { status: 200 }))
    const res = await submitDataValueSet(payload, {
      baseUrl: 'https://dhis2.example.ng/',
      authorization: 'ApiToken d2pat_fake',
      dryRun: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(res).toEqual({ status: 'SUCCESS' })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://dhis2.example.ng/api/dataValueSets?importStrategy=CREATE_AND_UPDATE&dryRun=true')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect((init.headers as Record<string, string>).Authorization).toBe('ApiToken d2pat_fake')
    expect(JSON.parse(init.body as string)).toEqual(payload)
  })
  it('refuses to send an invalid or PII-carrying payload', async () => {
    const fetchImpl = vi.fn()
    const bad = { ...payload, dataValues: [{ ...payload.dataValues[0]!, comment: 'x' }] }
    await expect(
      submitDataValueSet(bad as never, { baseUrl: 'https://x.test', authorization: 'Basic x', fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toBeInstanceOf(Dhis2ValidationError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('turns HTTP errors into Dhis2RequestError', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: 'Conflict' }), { status: 409 }))
    await expect(
      submitDataValueSet(payload, { baseUrl: 'https://x.test', authorization: 'Basic x', fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ name: 'Dhis2RequestError', status: 409 })
    expect(new Dhis2RequestError('x', 500, null).status).toBe(500)
  })
})

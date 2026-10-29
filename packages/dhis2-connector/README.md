# @mamacare/dhis2-connector

Open-source (Apache-2.0) TypeScript package for **privacy-preserving, aggregate** reporting from MamaCare AI to
[DHIS2](https://dhis2.org) (for example a State Primary Health Care Development Agency's instance).

It turns appointment history and a red-alert counter into a standard DHIS2 `DataValueSet` for
`POST /api/dataValueSets`. It has no runtime dependencies.

## What it reports

| Metric | Rule |
|---|---|
| ANC visits attended | completed `antenatal` appointments dated inside the period |
| Postnatal checkups completed | completed `postnatal` appointments inside the period |
| Child routine immunizations logged | completed `immunization` appointments inside the period |
| Obstetric emergency red alerts | `triageStats.redAlerts` (a counter supplied by the app) |

## Usage

```ts
import { aggregateMetrics, buildDataValueSet, submitDataValueSet } from '@mamacare/dhis2-connector'

const metrics = aggregateMetrics(appointments, { redAlerts: 2 }, 'Ab1Cd2Ef3Gh' /* orgUnit UID */, '202610')

const payload = buildDataValueSet(metrics, {
  // UIDs come from YOUR DHIS2 instance. There are deliberately no built-in defaults.
  dataElements: {
    ancVisitsAttended: '<uid>',
    postnatalCheckupsCompleted: '<uid>',
    childImmunizationsLogged: '<uid>',
    obstetricRedAlerts: '<uid>',
  },
  // categoryOptionCombo, attributeOptionCombo, dataSet are optional
})

await submitDataValueSet(payload, {
  baseUrl: 'https://dhis2.example.ng',
  authorization: 'ApiToken d2pat_...', // or 'Basic ...'
  dryRun: true, // ask DHIS2 to validate without saving
})
```

Resulting body:

```json
{
  "period": "202610",
  "orgUnit": "Ab1Cd2Ef3Gh",
  "dataValues": [
    { "dataElement": "<uid>", "value": "2" },
    { "dataElement": "<uid>", "value": "1" },
    { "dataElement": "<uid>", "value": "3" },
    { "dataElement": "<uid>", "value": "2" }
  ]
}
```

Supported periods: `yyyy`, `yyyyMM`, `yyyyQn`, `yyyyWn` (ISO weeks).

## Privacy rules (enforced in code and tests)

- `aggregateMetrics` reads only `appointmentType`, `status` and `date` of each appointment, only to increment a counter.
  Names, notes, facility, ids and dates never reach the output.
- The payload is checked against a strict allow-list before it is returned or sent: only `dataSet`, `period`, `orgUnit`,
  `completeDate`, `dataValues[{dataElement, categoryOptionCombo, attributeOptionCombo, value}]` are allowed, and every `value`
  must be a non-negative integer string. DHIS2's free-text `comment` / `storedBy` fields are rejected.
- `submitDataValueSet` re-validates and refuses to send anything that fails.
- Optional small-cell suppression: `buildDataValueSet(metrics, mapping, { suppressBelow: 5 })` omits non-zero counts below 5.

### Important: one phone is not an aggregate

MamaCare AI stores data per device. A report from a single phone, tagged with a facility, can describe one woman.
Do not submit device-level counts directly. Send them to an aggregation tier that combines many users first (and apply
`suppressBelow`), or have the person explicitly consent. This package only guarantees that *what it produces* contains
counts and nothing else; it does not decide who may send it. It is not yet wired into the app UI, and the app does not yet
record a red-alert counter.

## Development

```bash
pnpm --filter @mamacare/dhis2-connector test    # 42 tests incl. schema compliance and zero-PII checks
pnpm --filter @mamacare/dhis2-connector build   # emits dist/ with type declarations
```

The UIDs in the tests are made-up placeholders. Check payloads against your own DHIS2 instance (use `dryRun`).

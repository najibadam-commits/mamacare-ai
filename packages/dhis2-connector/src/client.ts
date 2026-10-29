import { Dhis2RequestError } from './errors.js'
import { assertValidDataValueSet } from './validate.js'
import type { DataValueSet } from './types.js'

export interface SubmitOptions {
  /** e.g. "https://dhis2.example.ng" or "https://play.dhis2.org/40.2.2" (any context path, no trailing /api). */
  baseUrl: string
  /** Full Authorization header value, e.g. `Basic ...` or `ApiToken d2pat_...`. Never logged. */
  authorization: string
  /** Ask DHIS2 to validate without saving. */
  dryRun?: boolean
  importStrategy?: 'CREATE' | 'UPDATE' | 'CREATE_AND_UPDATE' | 'DELETE'
  fetchImpl?: typeof fetch
}

/** POSTs a (re-validated) DataValueSet to `{baseUrl}/api/dataValueSets` and returns DHIS2's import summary. */
export async function submitDataValueSet(payload: DataValueSet, options: SubmitOptions): Promise<unknown> {
  assertValidDataValueSet(payload) // never send anything that fails the allow-list
  const params = new URLSearchParams({ importStrategy: options.importStrategy ?? 'CREATE_AND_UPDATE' })
  if (options.dryRun) params.set('dryRun', 'true')
  const url = `${options.baseUrl.replace(/\/+$/, '')}/api/dataValueSets?${params}`

  const response = await (options.fetchImpl ?? fetch)(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: options.authorization },
    body: JSON.stringify(payload),
  })
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // non-JSON body
  }
  if (!response.ok) throw new Dhis2RequestError(`DHIS2 responded with HTTP ${response.status}`, response.status, body)
  return body
}

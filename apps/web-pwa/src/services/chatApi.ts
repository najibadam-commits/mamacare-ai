import type { Language } from '../i18n/languages'
import { evaluateSymptoms } from './triage'
import type { TriageResult } from './triage'

/** Relative URL: the Vite dev/preview proxy (or a reverse proxy in production) forwards /api to the RAG engine. */
export const CHAT_ENDPOINT = '/api/chat'
export const CHAT_TIMEOUT_MS = 5000

export interface ChatSource {
  title: string
  category: string
}

export interface ChatAnswer {
  answer: string
  sources: ChatSource[]
  disclaimer: string
}

export type OfflineReason = 'offline' | 'timeout' | 'unreachable' | 'bad-response'

export type ChatOutcome =
  /** A danger sign was found locally. Nothing was sent over the network. */
  | { kind: 'emergency'; triage: TriageResult }
  | ({ kind: 'answer' } & ChatAnswer)
  /** The backend could not be used; the UI should show the local fallback. */
  | { kind: 'offline'; reason: OfflineReason }

export interface ChatOptions {
  /** Injectable for tests. */
  fetchImpl?: typeof fetch
  timeoutMs?: number
  isOnline?: () => boolean
}

const defaultIsOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)

/** Validates the JSON returned by POST /api/chat. Returns null if it is not the expected shape. */
export function parseChatResponse(data: unknown): ChatAnswer | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.answer !== 'string' || !d.answer.trim()) return null
  const sources = Array.isArray(d.sources)
    ? d.sources
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({ title: String(s.title ?? ''), category: String(s.category ?? '') }))
        .filter((s) => s.title)
    : []
  return { answer: d.answer, sources, disclaimer: typeof d.disclaimer === 'string' ? d.disclaimer : '' }
}

/**
 * Sends a question to the RAG backend. Never throws.
 *
 * Order matters for safety:
 *  1. The deterministic triage engine runs FIRST. A danger sign means no network request is made.
 *  2. If the device is offline, no request is made either.
 *  3. The request has a hard timeout; any network/HTTP/parse problem becomes `{ kind: 'offline' }`.
 */
export async function sendChatMessage(
  query: string,
  language: Language,
  userStage?: string,
  options: ChatOptions = {},
): Promise<ChatOutcome> {
  const triage = evaluateSymptoms(query, language)
  if (triage.critical) return { kind: 'emergency', triage }

  const isOnline = options.isOnline ?? defaultIsOnline
  if (!isOnline()) return { kind: 'offline', reason: 'offline' }

  const doFetch = options.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined)
  if (!doFetch) return { kind: 'offline', reason: 'unreachable' }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, options.timeoutMs ?? CHAT_TIMEOUT_MS)

  try {
    const response = await doFetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: query.trim(), language, ...(userStage ? { userStage } : {}) }),
      signal: controller.signal,
    })
    if (!response.ok) return { kind: 'offline', reason: 'unreachable' }
    const parsed = parseChatResponse(await response.json())
    if (!parsed) return { kind: 'offline', reason: 'bad-response' }
    return { kind: 'answer', ...parsed }
  } catch {
    return { kind: 'offline', reason: timedOut ? 'timeout' : 'unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

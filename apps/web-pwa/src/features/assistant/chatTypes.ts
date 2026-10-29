import type { Language } from '../../i18n/languages'
import type { ChatSource, OfflineReason } from '../../services/chatApi'
import type { OfflineCard } from '../../services/offlineFaq'
import type { TriageResult } from '../../services/triage'

interface BaseMessage {
  id: string
  createdAt: number
  /** App language when the message was created (used for the voice). */
  language: Language
}

export interface UserMessage extends BaseMessage {
  role: 'user'
  text: string
}

export interface AnswerMessage extends BaseMessage {
  role: 'assistant'
  kind: 'answer'
  text: string
  sources: ChatSource[]
  disclaimer: string
}

export interface UrgentMessage extends BaseMessage {
  role: 'assistant'
  kind: 'urgent'
  triage: TriageResult
}

export interface OfflineMessage extends BaseMessage {
  role: 'assistant'
  kind: 'offline'
  reason: OfflineReason
  cards: OfflineCard[]
}

export type ChatMessage = UserMessage | AnswerMessage | UrgentMessage | OfflineMessage

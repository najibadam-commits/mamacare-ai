import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Eraser, MessageCircleHeart, SendHorizontal, ShieldAlert } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { STAGES } from '../../data/stages'
import type { StageId } from '../../data/stages'
import { useSpeech } from '../../hooks/useSpeech'
import { useI18n } from '../../i18n/i18nContext'
import type { StringKey } from '../../i18n/strings'
import { sendChatMessage } from '../../services/chatApi'
import { getPreference, setPreference } from '../../services/db'
import { searchOfflineGuidance } from '../../services/offlineFaq'
import type { TriageResult } from '../../services/triage'
import ChatMessageView from './ChatMessageView'
import ChatSkeleton from './ChatSkeleton'
import { stageHint } from './stageHint'
import type { ChatMessage, UrgentMessage } from './chatTypes'

interface AssistantScreenProps {
  /** Opens the red EmergencyAlertModal. */
  onDangerSign: (result: TriageResult) => void
  onFindFacility: () => void
}

const STAGE_PREF_KEY = 'assistant.stage'
const MAX_QUERY_LENGTH = 1000
const CHIPS: StringKey[] = ['assistant.chip1', 'assistant.chip2', 'assistant.chip3']

let counter = 0
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`

export default function AssistantScreen({ onDangerSign, onFindFacility }: AssistantScreenProps) {
  const { t, language } = useI18n()
  const speech = useSpeech()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [stage, setStage] = useState<StageId | ''>('')
  // Incremented on reset so a response that arrives afterwards is dropped.
  const generation = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPreference<StageId>(STAGE_PREF_KEY)
      .then((s) => s && STAGES.includes(s) && setStage(s))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const changeStage = (value: StageId | '') => {
    setStage(value)
    setPreference(STAGE_PREF_KEY, value).catch(() => undefined)
  }

  const ask = useCallback(
    async (raw: string) => {
      const query = raw.trim().slice(0, MAX_QUERY_LENGTH)
      if (!query || loading) return
      const gen = generation.current
      speech.stop()
      setText('')
      setMessages((m) => [...m, { id: newId(), role: 'user', createdAt: Date.now(), language, text: query }])
      setLoading(true)

      const outcome = await sendChatMessage(query, language, stageHint(stage))
      if (gen !== generation.current) return // chat was cleared while waiting

      let reply: ChatMessage
      if (outcome.kind === 'emergency') {
        reply = { id: newId(), role: 'assistant', kind: 'urgent', createdAt: Date.now(), language, triage: outcome.triage }
        onDangerSign(outcome.triage)
      } else if (outcome.kind === 'answer') {
        reply = {
          id: newId(),
          role: 'assistant',
          kind: 'answer',
          createdAt: Date.now(),
          language,
          text: outcome.answer,
          sources: outcome.sources,
          disclaimer: outcome.disclaimer,
        }
      } else {
        const cards = await searchOfflineGuidance(query, language).catch(() => [])
        if (gen !== generation.current) return
        reply = { id: newId(), role: 'assistant', kind: 'offline', createdAt: Date.now(), language, reason: outcome.reason, cards }
      }
      setMessages((m) => [...m, reply])
      setLoading(false)
    },
    [language, loading, onDangerSign, speech, stage],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(text)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask(text)
    }
  }

  const clearChat = () => {
    generation.current++
    speech.stop()
    setMessages([])
    setLoading(false)
    setText('')
    setConfirmClear(false)
  }

  return (
    <section className="flex flex-col gap-3" aria-label={t('assistant.title')}>
      {/* Persistent disclaimer: stays pinned under the app header while the chat scrolls. */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 flex items-start gap-2 border-b border-teal/20 bg-blush px-4 py-2 text-xs font-medium text-slate-dark">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
        <p>{t('assistant.disclaimer')}</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="assistant-stage" className="block text-xs font-semibold text-slate-600">
            {t('assistant.stageLabel')}
          </label>
          <select
            id="assistant-stage"
            value={stage}
            onChange={(e) => changeStage(e.target.value as StageId | '')}
            aria-describedby="assistant-stage-help"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">{t('assistant.stageNone')}</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {t(`stage.${s}.name` as StringKey)}
              </option>
            ))}
          </select>
          <p id="assistant-stage-help" className="sr-only">
            {t('assistant.stageHelp')}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eraser className="h-4 w-4" aria-hidden />
            {t('assistant.clear')}
          </button>
        )}
      </div>

      <div role="log" aria-live="polite" aria-label={t('assistant.title')} className="space-y-4">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-slate-dark p-5 text-white">
            <MessageCircleHeart className="mb-3 h-8 w-8" aria-hidden />
            <p className="text-sm leading-relaxed">{t('assistant.welcome')}</p>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessageView
            key={m.id}
            message={m}
            speech={speech}
            onFindFacility={onFindFacility}
            onShowAlert={(u: UrgentMessage) => onDangerSign(u.triage)}
          />
        ))}
        {loading && <ChatSkeleton />}
        <div ref={endRef} className="scroll-mb-40" aria-hidden />
      </div>

      {messages.length === 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">{t('assistant.chipsTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => void ask(t(key))}
                className="min-h-10 rounded-full border border-teal/40 bg-white px-3 py-2 text-left text-sm text-teal hover:bg-teal/5"
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={submit}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex items-end gap-2 border-t border-slate-200 bg-surface/95 px-4 py-3 backdrop-blur"
      >
        <label htmlFor="assistant-input" className="sr-only">
          {t('assistant.inputLabel')}
        </label>
        <textarea
          id="assistant-input"
          rows={1}
          value={text}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('assistant.placeholder')}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          aria-label={t('assistant.send')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal text-white hover:bg-teal/90 disabled:opacity-40"
        >
          <SendHorizontal className="h-5 w-5" aria-hidden />
        </button>
      </form>

      {confirmClear && (
        <ConfirmDialog
          title={t('assistant.clearTitle')}
          message={t('assistant.clearBody')}
          confirmLabel={t('assistant.clear')}
          destructive
          onConfirm={clearChat}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </section>
  )
}

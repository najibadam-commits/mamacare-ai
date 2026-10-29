import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bot, ChevronDown, Hospital, Phone, TriangleAlert, User, WifiOff } from 'lucide-react'
import { useI18n } from '../../i18n/i18nContext'
import type { OfflineCard } from '../../services/offlineFaq'
import { NATIONAL_EMERGENCY_NUMBER } from '../../components/EmergencyAlertModal'
import SpeakButton from './SpeakButton'
import type { AnswerMessage, ChatMessage, OfflineMessage, UrgentMessage } from './chatTypes'

export interface SpeechControls {
  supported: boolean
  speakingId: string | null
  speak: (id: string, text: string, language: ChatMessage['language']) => void
  stop: () => void
}

interface Props {
  message: ChatMessage
  speech: SpeechControls
  onShowAlert: (message: UrgentMessage) => void
  onFindFacility: () => void
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/** Renders backend text: "- item" lines become a list, other lines become paragraphs. */
function AnswerText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let items: string[] = []
  const flush = () => {
    if (items.length) {
      const list = items
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
          {list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      )
      items = []
    }
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      flush()
    } else if (/^[-*]\s+/.test(trimmed)) {
      items.push(trimmed.replace(/^[-*]\s+/, ''))
    } else {
      flush()
      blocks.push(<p key={`p-${blocks.length}`}>{trimmed}</p>)
    }
  }
  flush()
  return <div className="space-y-2 text-sm leading-relaxed text-slate-dark">{blocks}</div>
}

function Sources({ sources }: { sources: AnswerMessage['sources'] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  if (sources.length === 0) return null
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-teal"
      >
        <span>
          {t('assistant.sources')} ({sources.length})
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {sources.map((s) => (
            <li key={`${s.title}-${s.category}`} className="rounded-lg bg-surface px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold">{t('assistant.sourceLabel')}:</span> {s.title}
              {s.category && <span className="ml-2 rounded-full bg-teal/10 px-2 py-0.5 text-[11px] text-teal">{s.category}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Meta({ role, createdAt }: { role: 'user' | 'assistant'; createdAt: number }) {
  const { t } = useI18n()
  const Icon = role === 'user' ? User : Bot
  return (
    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{role === 'user' ? t('assistant.you') : t('assistant.guide')}</span>
      <span aria-hidden>·</span>
      <time dateTime={new Date(createdAt).toISOString()} className="font-normal">
        {formatTime(createdAt)}
      </time>
    </div>
  )
}

function OfflineCards({ message, speech }: { message: OfflineMessage; speech: SpeechControls }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <div role="status" className="flex items-start gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p>{t('assistant.offlineMode')}</p>
          {message.reason !== 'offline' && <p className="mt-1 font-normal">{t('assistant.unreachable')}</p>}
        </div>
      </div>

      {message.cards.length === 0 ? (
        <p className="rounded-xl bg-white p-3 text-sm text-slate-dark">{t('assistant.offlineNoMatch')}</p>
      ) : (
        message.cards.map((card) => <FaqCard key={card.slug} id={`${message.id}:${card.slug}`} card={card} message={message} speech={speech} />)
      )}
      <p className="text-xs text-slate-500">{t('assistant.offlineDisclaimer')}</p>
    </div>
  )
}

function FaqCard({ id, card, message, speech }: { id: string; card: OfflineCard; message: OfflineMessage; speech: SpeechControls }) {
  const { t } = useI18n()
  const spoken = [card.title, card.summary, ...card.takeaways, card.warning].filter(Boolean).join('. ')
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-bold text-navy">{card.title}</h4>
      <p className="mt-1 text-sm text-slate-dark">{card.summary}</p>
      {card.takeaways.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-500">{t('assistant.keyPoints')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-dark">
            {card.takeaways.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </div>
      )}
      {card.warning && (
        <p className="mt-2 flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {card.warning}
        </p>
      )}
      <div className="mt-3">
        <SpeakButton
          supported={speech.supported}
          playing={speech.speakingId === id}
          onPlay={() => speech.speak(id, spoken, message.language)}
          onStop={speech.stop}
        />
      </div>
    </article>
  )
}

function UrgentCard({ message, speech, onShowAlert, onFindFacility }: { message: UrgentMessage; speech: SpeechControls } & Pick<Props, 'onShowAlert' | 'onFindFacility'>) {
  const { t } = useI18n()
  const { triage } = message
  const labels = triage.matches.map((m) => m.label)
  const spoken = `${t('assistant.urgentTitle')}. ${t('assistant.urgentBody')} ${triage.recommendedAction}`
  return (
    <div role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-red-900">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-6 w-6 shrink-0 text-red-600" aria-hidden />
        <h3 className="text-base font-extrabold">{t('assistant.urgentTitle')}</h3>
      </div>
      {labels.length > 0 && <p className="mt-2 text-sm font-semibold">{[...new Set(labels)].join(' · ')}</p>}
      <p className="mt-2 text-sm font-semibold">{t('assistant.urgentBody')}</p>
      {triage.recommendedAction && <p className="mt-2 text-sm">{triage.recommendedAction}</p>}
      <div className="mt-3 grid gap-2">
        <a href={`tel:${NATIONAL_EMERGENCY_NUMBER}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
          <Phone className="h-4 w-4" aria-hidden />
          {t('modal.call112')}
        </a>
        <button type="button" onClick={onFindFacility} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-600 bg-white px-4 py-2 text-sm font-bold text-red-700">
          <Hospital className="h-4 w-4" aria-hidden />
          {t('modal.findFacility')}
        </button>
        <button type="button" onClick={() => onShowAlert(message)} className="min-h-9 text-xs font-semibold text-red-700 underline">
          {t('assistant.showAlert')}
        </button>
      </div>
      <div className="mt-2">
        <SpeakButton
          supported={speech.supported}
          playing={speech.speakingId === message.id}
          onPlay={() => speech.speak(message.id, spoken, message.language)}
          onStop={speech.stop}
        />
      </div>
    </div>
  )
}

export default function ChatMessageView({ message, speech, onShowAlert, onFindFacility }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[88%]">
          <Meta role="user" createdAt={message.createdAt} />
          <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-navy px-4 py-2.5 text-sm text-white">{message.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start">
      <div className="w-full max-w-[94%]">
        <Meta role="assistant" createdAt={message.createdAt} />
        {message.kind === 'answer' && (
          <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4">
            <AnswerText text={message.text} />
            <Sources sources={message.sources} />
            {message.disclaimer && <p className="mt-3 text-xs text-slate-500">{message.disclaimer}</p>}
            <div className="mt-3">
              <SpeakButton
                supported={speech.supported}
                playing={speech.speakingId === message.id}
                onPlay={() => speech.speak(message.id, message.text, message.language)}
                onStop={speech.stop}
              />
            </div>
          </div>
        )}
        {message.kind === 'urgent' && <UrgentCard message={message} speech={speech} onShowAlert={onShowAlert} onFindFacility={onFindFacility} />}
        {message.kind === 'offline' && <OfflineCards message={message} speech={speech} />}
      </div>
    </div>
  )
}

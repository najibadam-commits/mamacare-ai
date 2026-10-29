import { useI18n } from '../../i18n/i18nContext'

/** Pulsing placeholder bubble shown while waiting for the backend. */
export default function ChatSkeleton() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-start" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('assistant.thinking')}</span>
      <div className="w-full max-w-[94%] animate-pulse rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4" aria-hidden>
        <div className="mb-3 h-3 w-28 rounded bg-slate-200" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-11/12 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { BellRing, Clock3, ShieldCheck, Smartphone, ToggleRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Sheet from './Sheet'
import { useI18n } from '../i18n/i18nContext'
import { enableReminders } from '../services/notifications'
import type { PermissionState } from '../services/notifications'
import type { StringKey } from '../i18n/strings'

interface ConsentSheetProps {
  onClose: () => void
  onResult?: (permission: PermissionState) => void
}

const POINTS: { icon: LucideIcon; title: StringKey; body: StringKey }[] = [
  { icon: BellRing, title: 'consent.whatTitle', body: 'consent.whatBody' },
  { icon: Smartphone, title: 'consent.localTitle', body: 'consent.localBody' },
  { icon: Clock3, title: 'consent.whenTitle', body: 'consent.whenBody' },
  { icon: ShieldCheck, title: 'consent.privacyTitle', body: 'consent.privacyBody' },
  { icon: ToggleRight, title: 'consent.revokeTitle', body: 'consent.revokeBody' },
]

/** Plain-language consent shown BEFORE the browser permission prompt. */
export default function ConsentSheet({ onClose, onResult }: ConsentSheetProps) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState<PermissionState | null>(null)

  const allow = async () => {
    setBusy(true)
    const result = await enableReminders().catch(() => 'denied' as const)
    setBusy(false)
    onResult?.(result)
    if (result === 'granted') onClose()
    else setBlocked(result)
  }

  return (
    <Sheet
      title={t('consent.title')}
      onClose={onClose}
      zClass="z-50"
      footer={
        <div className="space-y-2">
          {blocked && (
            <p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
              {blocked === 'unsupported' ? t('rem.unsupported') : t('rem.blocked')}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
              {t('consent.decline')}
            </button>
            <button type="button" onClick={allow} disabled={busy} className="flex-1 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60">
              {t('consent.allow')}
            </button>
          </div>
        </div>
      }
    >
      <p className="text-sm text-slate-600">{t('consent.intro')}</p>
      <ul className="mt-3 space-y-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden />
            <div>
              <h3 className="text-sm font-bold text-navy">{t(title)}</h3>
              <p className="mt-0.5 text-sm text-slate-600">{t(body)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-slate-dark p-3 text-white">
        <p className="text-[11px] uppercase tracking-wide text-white/60">{t('consent.preview')}</p>
        <p className="mt-1 text-sm font-semibold">{t('notif.discreetTitle')}</p>
        <p className="text-sm text-white/90">{t('notif.discreetTomorrow', { time: '10:00 AM' })}</p>
      </div>
    </Sheet>
  )
}

import { useState } from 'react'
import { Bell, BellOff, EyeOff } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'
import { useNotificationSettings } from '../hooks/useNotificationSettings'
import { disableReminders, sendTestReminder, setDiscreet } from '../services/notifications'

interface ReminderSettingsCardProps {
  onRequestEnable: () => void
}

export default function ReminderSettingsCard({ onRequestEnable }: ReminderSettingsCardProps) {
  const { t, language } = useI18n()
  const { enabled, consented, permission, discreet, ready } = useNotificationSettings()
  const [testing, setTesting] = useState(false)

  if (!ready) return null
  const blocked = permission === 'denied'
  const unsupported = permission === 'unsupported'

  const test = async () => {
    setTesting(true)
    await sendTestReminder({ language, t }).catch(() => false)
    setTesting(false)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={t('rem.title')}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${enabled ? 'bg-teal text-white' : 'bg-slate-100 text-slate-500'}`}>
          {enabled ? <Bell className="h-5 w-5" aria-hidden /> : <BellOff className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-navy">{enabled ? t('rem.statusOn') : t('rem.statusOff')}</h3>
          {!enabled && <p className="mt-0.5 text-xs text-slate-600">{t('rem.descOff')}</p>}
          {unsupported && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('rem.unsupported')}</p>}
          {blocked && !unsupported && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('rem.blocked')}</p>}
        </div>
        {!enabled && !unsupported && (
          <button type="button" onClick={onRequestEnable} className="shrink-0 rounded-full bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90">
            {t('rem.turnOn')}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-start gap-3 border-t border-slate-100 pt-3">
        <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
        <div className="min-w-0 flex-1">
          <p id="discreet-label" className="text-sm font-semibold text-navy">
            {t('rem.discreetTitle')}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{t('rem.discreetDesc')}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{t('rem.discreetNote')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={discreet}
          aria-labelledby="discreet-label"
          onClick={() => void setDiscreet(!discreet)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${discreet ? 'bg-teal' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${discreet ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {consented && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {enabled && (
              <button type="button" onClick={test} disabled={testing} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60">
                {t('rem.test')}
              </button>
            )}
            <button type="button" onClick={() => void disableReminders()} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
              {t('rem.turnOff')}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{t('rem.revokeHint')}</p>
        </div>
      )}
    </section>
  )
}

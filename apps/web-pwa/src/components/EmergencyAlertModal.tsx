import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapPinned, Phone, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'
import { db, getSecurePreference, setSecurePreference } from '../services/db'
import type { TriageResult } from '../services/triage'

const CONTACT_KEY = 'emergency.contact'
export const NATIONAL_EMERGENCY_NUMBER = '112'

interface EmergencyAlertModalProps {
  /** Triage result that opened the modal; null when opened from the SOS badge. */
  result: TriageResult | null
  onClose: () => void
  onFindFacility: () => void
}

function cleanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 ? cleaned : null
}

export default function EmergencyAlertModal({ result, onClose, onFindFacility }: EmergencyAlertModalProps) {
  const { t } = useI18n()
  const callRef = useRef<HTMLAnchorElement>(null)
  const savedContact = useLiveQuery(() => getSecurePreference(CONTACT_KEY).then((v) => v ?? null), [])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)

  const isEmergency = !result || result.urgency === 'emergency'
  const title = !result ? t('modal.title.sos') : isEmergency ? t('modal.title.emergency') : t('modal.title.urgent')

  useEffect(() => {
    callRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const saveContact = async () => {
    const phone = cleanPhone(draft)
    if (!phone) {
      setInvalid(true)
      return
    }
    await setSecurePreference(CONTACT_KEY, phone)
    setEditing(false)
    setInvalid(false)
  }
  const removeContact = async () => {
    await db.userPreferences.delete(CONTACT_KEY)
    setEditing(false)
  }
  const startEdit = async () => {
    setDraft((await getSecurePreference(CONTACT_KEY)) ?? '')
    setEditing(true)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="emergency-title" aria-describedby="emergency-calm" data-testid="emergency-modal" data-urgency={result?.urgency ?? 'sos'}>
      <div className="absolute inset-0 bg-red-950/80" aria-hidden />
      <div className="relative flex max-h-[96vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className={`px-5 pb-4 pt-5 text-white ${isEmergency ? 'bg-red-700' : 'bg-orange-600'}`}>
          <div className="flex items-center gap-3">
            <TriangleAlert className="h-8 w-8 shrink-0" aria-hidden />
            <h2 id="emergency-title" className="text-2xl font-extrabold leading-tight">
              {title}
            </h2>
          </div>
          <p id="emergency-calm" className="mt-2 text-base font-medium text-white/95">
            {t('modal.calm')}
          </p>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {result && (
            <section aria-label={t('modal.noticed')} className="rounded-2xl border border-red-200 bg-red-50 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-red-800">{t('modal.noticed')}</h3>
              <ul className="mt-2 space-y-2">
                {result.matches.map((m) => (
                  <li key={m.id} className="text-sm text-red-950">
                    <p className="font-bold">{t(`triage.sign.${m.id}.name`)}</p>
                    <p className="text-red-900/90">{t(`triage.sign.${m.id}.desc`)}</p>
                  </li>
                ))}
              </ul>
              {result.primarySign && (
                <p className="mt-3 rounded-lg bg-white p-2 text-sm font-semibold text-red-900">{t(`triage.sign.${result.primarySign}.action`)}</p>
              )}
            </section>
          )}

          <ol className="space-y-2 text-base text-slate-dark">
            {(['modal.step1', 'modal.step2', 'modal.step3'] as const).map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">{i + 1}</span>
                <span className="pt-0.5">{t(k)}</span>
              </li>
            ))}
          </ol>

          <div className="space-y-2">
            <a
              ref={callRef}
              href={`tel:${NATIONAL_EMERGENCY_NUMBER}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 py-4 text-lg font-extrabold text-white shadow hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              <Phone className="h-6 w-6" aria-hidden />
              {t('modal.call112')}
            </a>

            {savedContact && !editing && (
              <div className="flex gap-2">
                <a href={`tel:${savedContact}`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-red-700 px-4 py-3 text-base font-bold text-red-800 hover:bg-red-50">
                  <Phone className="h-5 w-5" aria-hidden />
                  {t('modal.contact.call', { phone: savedContact })}
                </a>
                <button type="button" onClick={() => void startEdit()} className="rounded-2xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50">
                  {t('modal.contact.change')}
                </button>
              </div>
            )}

            {!savedContact && !editing && (
              <button type="button" onClick={() => { setDraft(''); setEditing(true) }} className="w-full rounded-2xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                + {t('modal.contact.add')}
              </button>
            )}

            {editing && (
              <div className="rounded-2xl border border-slate-200 p-3">
                <label htmlFor="emergency-contact" className="text-sm font-semibold text-navy">{t('modal.contact.title')}</label>
                <input
                  id="emergency-contact"
                  type="tel"
                  inputMode="tel"
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setInvalid(false) }}
                  placeholder={t('modal.contact.phone')}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
                {invalid && <p role="alert" className="mt-1 text-xs text-red-700">{t('modal.contact.invalid')}</p>}
                <p className="mt-1 text-[11px] text-slate-500">{t('modal.contact.privacy')}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => void saveContact()} className="rounded-full bg-teal px-4 py-1.5 text-sm font-semibold text-white">{t('modal.contact.save')}</button>
                  {savedContact && (
                    <button type="button" onClick={() => void removeContact()} className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-700">{t('modal.contact.remove')}</button>
                  )}
                  <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold">{t('common.cancel')}</button>
                </div>
              </div>
            )}

            <button type="button" onClick={onFindFacility} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-3.5 text-base font-bold text-white hover:bg-navy/90">
              <MapPinned className="h-5 w-5" aria-hidden />
              {t('modal.findFacility')}
            </button>
          </div>

          <div className="flex gap-2 rounded-2xl bg-slate-dark p-3 text-white">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-bold leading-snug">{t('modal.disclaimer')}</p>
          </div>
        </div>

        <footer className="border-t border-slate-200 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
            {t('modal.close')}
          </button>
        </footer>
      </div>
    </div>
  )
}

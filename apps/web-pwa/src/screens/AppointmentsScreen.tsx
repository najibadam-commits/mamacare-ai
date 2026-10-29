import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, HeartPulse, Plus } from 'lucide-react'
import AppointmentCard from '../components/AppointmentCard'
import AppointmentForm from '../components/AppointmentForm'
import ConfirmDialog from '../components/ConfirmDialog'
import ConsentSheet from '../components/ConsentSheet'
import ReminderSettingsCard from '../components/ReminderSettingsCard'
import { useI18n } from '../i18n/i18nContext'
import { deleteAppointment, getPastAppointments, getUpcomingAppointments, updateAppointment } from '../services/db'
import type { Appointment } from '../services/db'
import { pokeReminderEngine } from '../services/notifications'

type Tab = 'upcoming' | 'past'
type FormState = { appointment?: Appointment } | null
type ConfirmState = { kind: 'complete' | 'delete'; appointment: Appointment } | null

export default function AppointmentsScreen() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [form, setForm] = useState<FormState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [consentOpen, setConsentOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Re-evaluate "upcoming vs past" every minute.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const now = new Date(nowMs)
  const upcoming = useLiveQuery(() => getUpcomingAppointments(new Date(nowMs)), [nowMs])
  const past = useLiveQuery(() => getPastAppointments(new Date(nowMs)), [nowMs])
  const list = tab === 'upcoming' ? upcoming : past

  const runConfirm = async () => {
    if (!confirm?.appointment.id) return
    const { kind, appointment } = confirm
    setConfirm(null)
    if (kind === 'delete') await deleteAppointment(appointment.id!)
    else await updateAppointment(appointment.id!, { status: 'completed' })
    pokeReminderEngine()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy">{t('appointments.title')}</h2>
          <p className="mt-0.5 text-sm text-slate-600">{t('appt.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setForm({})} className="flex shrink-0 items-center gap-1.5 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white shadow hover:bg-teal/90">
          <Plus className="h-4 w-4" aria-hidden />
          {t('appt.add')}
        </button>
      </div>

      <ReminderSettingsCard onRequestEnable={() => setConsentOpen(true)} />

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-slate-200 p-1">
        {(['upcoming', 'past'] as const).map((id) => {
          const count = (id === 'upcoming' ? upcoming : past)?.length
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-navy shadow' : 'text-slate-600'}`}
            >
              {t(id === 'upcoming' ? 'appt.tab.upcoming' : 'appt.tab.past')}
              {count ? <span className="ml-1.5 rounded-full bg-blush px-1.5 text-xs text-navy">{count}</span> : null}
            </button>
          )
        })}
      </div>

      {list === undefined ? (
        <p className="py-8 text-center text-sm text-slate-500">{t('appt.loading')}</p>
      ) : list.length === 0 ? (
        tab === 'upcoming' ? (
          <div className="space-y-3 text-center">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
              <CalendarPlus className="mx-auto h-10 w-10 text-teal" aria-hidden />
              <h3 className="mt-3 text-lg font-bold text-navy">{t('appt.empty.upcomingTitle')}</h3>
              <p className="mt-1 text-sm text-slate-600">{t('appt.empty.upcomingBody')}</p>
              <button type="button" onClick={() => setForm({})} className="mt-4 rounded-full bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal/90">
                {t('appt.add')}
              </button>
            </div>
            <div className="flex gap-3 rounded-2xl bg-blush p-4 text-left">
              <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
              <div>
                <h4 className="text-sm font-bold text-navy">{t('appt.empty.tipTitle')}</h4>
                <p className="mt-0.5 text-sm text-slate-dark">{t('appt.empty.tipBody')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <h3 className="text-base font-bold text-navy">{t('appt.empty.pastTitle')}</h3>
            <p className="mt-1 text-sm text-slate-600">{t('appt.empty.pastBody')}</p>
          </div>
        )
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <AppointmentCard
                appointment={a}
                now={now}
                onEdit={(appointment) => setForm({ appointment })}
                onComplete={(appointment) => setConfirm({ kind: 'complete', appointment })}
                onDelete={(appointment) => setConfirm({ kind: 'delete', appointment })}
              />
            </li>
          ))}
        </ul>
      )}

      {form && (
        <AppointmentForm
          key={form.appointment?.id ?? 'new'}
          initial={form.appointment}
          onClose={() => setForm(null)}
          onRequestReminders={() => setConsentOpen(true)}
        />
      )}

      {consentOpen && <ConsentSheet onClose={() => setConsentOpen(false)} />}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'delete' ? t('appt.confirm.deleteTitle') : t('appt.confirm.completeTitle')}
          message={confirm.kind === 'delete' ? t('appt.confirm.deleteBody') : t('appt.confirm.completeBody')}
          confirmLabel={confirm.kind === 'delete' ? t('appt.confirm.deleteConfirm') : t('appt.confirm.completeConfirm')}
          destructive={confirm.kind === 'delete'}
          onConfirm={() => void runConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  )
}

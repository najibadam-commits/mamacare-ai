import { useState } from 'react'
import type { FormEvent } from 'react'
import Sheet from './Sheet'
import { useI18n } from '../i18n/i18nContext'
import { useNotificationSettings } from '../hooks/useNotificationSettings'
import { toDateInput, toTimeInput } from '../lib/dates'
import { APPOINTMENT_TYPES, REMINDER_OFFSETS, createAppointment, updateAppointment } from '../services/db'
import type { Appointment, AppointmentType, ReminderOffset } from '../services/db'
import { pokeReminderEngine } from '../services/notifications'
import type { StringKey } from '../i18n/strings'

const FACILITY_CHIPS: StringKey[] = ['appt.facility.phc', 'appt.facility.general', 'appt.facility.private', 'appt.facility.maternity']

interface AppointmentFormProps {
  initial?: Appointment
  onClose: () => void
  onRequestReminders: () => void
}

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-dark focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30'

export default function AppointmentForm({ initial, onClose, onRequestReminders }: AppointmentFormProps) {
  const { t } = useI18n()
  const { enabled: remindersOn } = useNotificationSettings()
  const [type, setType] = useState<AppointmentType>(initial?.appointmentType ?? 'antenatal')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? toDateInput(new Date()))
  const [time, setTime] = useState(initial?.time ?? (() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toTimeInput(d)
  })())
  const [facility, setFacility] = useState(initial?.facilityName ?? '')
  const [offset, setOffset] = useState<ReminderOffset>((initial?.reminderOffsetMinutes as ReminderOffset) ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!date || !time) {
      setError(true)
      return
    }
    setSaving(true)
    setSaveFailed(false)
    const data = { title, appointmentType: type, date, time, facilityName: facility, notes, reminderOffsetMinutes: offset }
    try {
      if (initial?.id !== undefined) {
        await updateAppointment(initial.id, {
          ...data,
          title: title.trim(),
          facilityName: facility.trim(),
          notes: notes.trim(),
        })
      } else {
        await createAppointment(data)
      }
    } catch (err) {
      // e.g. encryption unavailable on an insecure (http) connection: never fall back to plaintext.
      console.error('Could not save appointment', err)
      setSaving(false)
      setSaveFailed(true)
      return
    }
    pokeReminderEngine()
    onClose()
  }

  return (
    <Sheet
      title={initial ? t('appt.form.editTitle') : t('appt.form.addTitle')}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
            {t('appt.form.cancel')}
          </button>
          <button type="submit" form="appointment-form" disabled={saving} className="flex-1 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60">
            {t('appt.form.save')}
          </button>
        </div>
      }
    >
      <form id="appointment-form" onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-navy">{t('appt.type.label')}</legend>
          <div role="radiogroup" aria-label={t('appt.type.label')} className="grid grid-cols-2 gap-2">
            {APPOINTMENT_TYPES.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={type === id}
                onClick={() => setType(id)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  type === id ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-dark hover:border-teal'
                }`}
              >
                {t(`appt.type.${id}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="appt-title" className="mb-1.5 block text-sm font-semibold text-navy">{t('appt.field.title')}</label>
          <input id="appt-title" className={fieldClass} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={t('appt.field.titlePlaceholder')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="appt-date" className="mb-1.5 block text-sm font-semibold text-navy">{t('appt.field.date')}</label>
            <input id="appt-date" type="date" required className={fieldClass} value={date} onChange={(e) => { setDate(e.target.value); setError(false) }} />
          </div>
          <div>
            <label htmlFor="appt-time" className="mb-1.5 block text-sm font-semibold text-navy">{t('appt.field.time')}</label>
            <input id="appt-time" type="time" required className={fieldClass} value={time} onChange={(e) => { setTime(e.target.value); setError(false) }} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{t('appt.form.errorDateTime')}</p>}

        <div>
          <label htmlFor="appt-facility" className="mb-1.5 block text-sm font-semibold text-navy">{t('appt.field.facility')}</label>
          <input id="appt-facility" className={fieldClass} value={facility} maxLength={120} onChange={(e) => setFacility(e.target.value)} placeholder={t('appt.field.facilityPlaceholder')} />
          <div className="mt-2 flex flex-wrap gap-2" aria-label={t('appt.field.quickSelect')}>
            {FACILITY_CHIPS.map((key) => (
              <button key={key} type="button" onClick={() => setFacility(t(key))} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-dark hover:border-teal">
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="appt-reminder" className="mb-1.5 block text-sm font-semibold text-navy">{t('appt.field.reminder')}</label>
          <select id="appt-reminder" className={fieldClass} value={offset} onChange={(e) => setOffset(Number(e.target.value) as ReminderOffset)}>
            {REMINDER_OFFSETS.map((o) => (
              <option key={o} value={o}>{t(`appt.reminder.${o}`)}</option>
            ))}
          </select>
          {offset > 0 && !remindersOn && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
              <span>{t('appt.reminder.needsOn')}</span>
              <button type="button" onClick={onRequestReminders} className="shrink-0 rounded-full bg-teal px-3 py-1 font-semibold text-white">
                {t('appt.reminder.turnOn')}
              </button>
            </div>
          )}
        </div>

        <div>
          {saveFailed && <p role="alert" className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">{t('appt.error.save')}</p>}
          <label htmlFor="appt-notes" className="mb-1.5 block text-sm font-semibold text-navy">{t('appt.field.notes')}</label>
          <textarea id="appt-notes" rows={3} maxLength={500} className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('appt.field.notesPlaceholder')} />
        </div>
      </form>
    </Sheet>
  )
}

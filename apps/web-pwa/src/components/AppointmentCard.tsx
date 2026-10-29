import { Bell, CalendarDays, CircleCheck, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'
import { formatDate, formatTime } from '../lib/dates'
import { appointmentStartMs } from '../services/db'
import type { Appointment, AppointmentType, ReminderOffset } from '../services/db'

const BADGE: Record<AppointmentType, string> = {
  antenatal: 'bg-teal text-white',
  postnatal: 'bg-navy text-white',
  immunization: 'bg-blush text-navy ring-1 ring-pink-300',
  general: 'bg-slate-200 text-slate-dark',
}
const ACCENT: Record<AppointmentType, string> = {
  antenatal: 'border-l-teal',
  postnatal: 'border-l-navy',
  immunization: 'border-l-pink-300',
  general: 'border-l-slate-300',
}

interface AppointmentCardProps {
  appointment: Appointment
  now: Date
  onEdit: (a: Appointment) => void
  onComplete: (a: Appointment) => void
  onDelete: (a: Appointment) => void
}

export default function AppointmentCard({ appointment: a, now, onEdit, onComplete, onDelete }: AppointmentCardProps) {
  const { t, language } = useI18n()
  const passed = a.status === 'scheduled' && appointmentStartMs(a) < now.getTime()
  const title = a.title || t(`appt.defaultTitle.${a.appointmentType}`)
  const offset = a.reminderOffsetMinutes as ReminderOffset

  return (
    <article className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm ${ACCENT[a.appointmentType]}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className={`rounded-full px-2.5 py-0.5 ${BADGE[a.appointmentType]}`}>{t(`appt.type.${a.appointmentType}`)}</span>
        {a.status === 'completed' && (
          <span className="flex items-center gap-1 text-teal">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            {t('appt.status.completed')}
          </span>
        )}
        {a.status === 'cancelled' && <span className="text-slate-500">{t('appt.status.cancelled')}</span>}
        {passed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">{t('appt.status.past')}</span>}
      </div>

      <h3 className="mt-2 text-base font-bold text-navy">{title}</h3>

      <dl className="mt-2 space-y-1 text-sm text-slate-dark">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <dd>{formatDate(a.date, language)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <dd>{formatTime(a.time, language)}</dd>
        </div>
        {a.facilityName && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <dd>{a.facilityName}</dd>
          </div>
        )}
        {a.reminderEnabled && a.status === 'scheduled' && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Bell className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <dd>{t('appt.card.reminder', { when: t(`appt.reminder.${offset}`) })}</dd>
          </div>
        )}
      </dl>

      {a.notes && <p className="mt-2 line-clamp-3 rounded-lg bg-surface p-2 text-xs text-slate-600">{a.notes}</p>}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={() => onEdit(a)} className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {t('appt.action.edit')}
        </button>
        {a.status === 'scheduled' && (
          <button type="button" onClick={() => onComplete(a)} className="flex items-center gap-1.5 rounded-full border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/5">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            {t('appt.action.complete')}
          </button>
        )}
        <button type="button" onClick={() => onDelete(a)} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {t('appt.action.delete')}
        </button>
      </div>
    </article>
  )
}

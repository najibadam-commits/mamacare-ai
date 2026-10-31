import { useEffect, useState } from 'react'
import { BookOpen, CalendarPlus, ChevronRight, MapPin, MessageCircle, ShieldAlert } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'
import { getUpcomingAppointments, type Appointment } from '../services/db'
import type { TabId } from '../lib/nav'

interface HomeScreenProps {
  onNavigate: (tab: TabId) => void
  onEmergency: () => void
}

export default function HomeScreen({ onNavigate, onEmergency }: HomeScreenProps) {
  const { t, language } = useI18n()
  const [next, setNext] = useState<Appointment | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    getUpcomingAppointments()
      .then((list) => alive && setNext(list[0] ?? null))
      .catch(() => alive && setNext(null))
    return () => {
      alive = false
    }
  }, [])

  const when =
    next && new Date(`${next.date}T${next.time || '00:00'}`).toLocaleString(language === 'pcm' ? 'en-NG' : language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  const actions: { id: TabId; label: string; Icon: typeof BookOpen }[] = [
    { id: 'assistant', label: t('home.ask'), Icon: MessageCircle },
    { id: 'guides', label: t('home.readGuides'), Icon: BookOpen },
    { id: 'directory', label: t('home.findFacility'), Icon: MapPin },
  ]

  return (
    <section className="flex flex-col gap-4" aria-label={t('nav.home')}>
      <div className="rounded-2xl bg-navy p-5 text-white shadow">
        <h2 className="text-2xl font-bold">{t('home.title')}</h2>
        <p className="mt-1 text-sm text-white/85">{t('home.tagline')}</p>
        <p className="mt-3 text-xs text-white/70">{t('home.privacy')}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">{t('home.nextVisit')}</h3>
        {next ? (
          <button
            type="button"
            onClick={() => onNavigate('appointments')}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-blush px-4 py-3 text-left"
          >
            <span>
              <span className="block font-semibold text-slate-dark">{t(`appt.type.${next.appointmentType}` as never)}</span>
              <span className="block text-sm text-slate-700">{when}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-teal" aria-hidden />
          </button>
        ) : (
          <div className="mt-2">
            {next === null && <p className="text-sm text-slate-700">{t('home.noVisit')}</p>}
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
              {t('home.addVisit')}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <h3 className="flex items-center gap-2 font-bold text-red-900">
          <ShieldAlert className="h-5 w-5" aria-hidden />
          {t('home.dangerTitle')}
        </h3>
        <p className="mt-1 text-sm text-red-900/90">{t('home.dangerBody')}</p>
        <button
          type="button"
          onClick={onEmergency}
          className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          {t('home.dangerButton')}
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600">{t('home.quickTitle')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {actions.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center text-xs font-semibold text-slate-dark shadow-sm active:scale-95"
            >
              <Icon className="h-6 w-6 text-teal" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

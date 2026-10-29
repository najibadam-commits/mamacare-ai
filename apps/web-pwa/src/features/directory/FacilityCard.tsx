import { BadgeCheck, Clock3, MapPin, Navigation, Phone, ShieldAlert, Siren } from 'lucide-react'
import { useI18n } from '../../i18n/i18nContext'
import { formatDate } from '../../lib/dates'
import type { Facility } from '../../services/facilitiesData'

const TYPE_BADGE: Record<Facility['facilityType'], string> = {
  tertiary: 'bg-navy text-white',
  general_hospital: 'bg-teal text-white',
  maternity_home: 'bg-blush text-navy ring-1 ring-pink-300',
  phc: 'bg-slate-200 text-slate-dark',
}

interface FacilityCardProps {
  facility: Facility
  distanceKm?: number
}

export default function FacilityCard({ facility: f, distanceKm }: FacilityCardProps) {
  const { t, language } = useI18n()
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${f.name}, ${f.address}, ${f.state}, Nigeria`)}`

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="facility-card">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className={`rounded-full px-2.5 py-0.5 ${TYPE_BADGE[f.facilityType]}`}>{t(`dir.type.${f.facilityType}`)}</span>
        {f.emergencyServices && (
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-700">
            <Siren className="h-3 w-3" aria-hidden />
            {t('dir.emergencyBadge')}
          </span>
        )}
        {f.verifiedDate ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {t('dir.verified', { date: formatDate(f.verifiedDate, language) })}
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            {t('dir.notVerified')}
          </span>
        )}
        {f.isSample && <span className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-500">{t('dir.sample')}</span>}
      </div>

      <h3 className="mt-2 text-base font-bold leading-snug text-navy">{f.name}</h3>

      <dl className="mt-2 space-y-1 text-sm text-slate-dark">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <dd>
            {f.address} · {f.lga}, {f.state}
            {distanceKm !== undefined && (
              <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-xs font-semibold text-navy">
                {t('dir.distance', { km: distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm) })}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock3 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <dd>{f.emergencyServices ? t('dir.hours24') : t('dir.hoursDay')}</dd>
        </div>
      </dl>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Services">
        {f.servicesOffered.map((s) => (
          <li key={s} className="rounded-full bg-surface px-2.5 py-1 text-xs text-slate-dark ring-1 ring-slate-200">
            {t(`dir.service.${s}`)}
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        {f.phone ? (
          <a href={`tel:${f.phone}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-teal px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal/90">
            <Phone className="h-4 w-4" aria-hidden />
            {t('dir.call')}
          </a>
        ) : (
          <span className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-medium text-slate-500" aria-disabled="true">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {t('dir.noPhone')}
          </span>
        )}
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-teal px-3 py-2.5 text-sm font-semibold text-teal hover:bg-teal/5">
          <Navigation className="h-4 w-4" aria-hidden />
          {t('dir.directions')}
        </a>
      </div>
    </article>
  )
}

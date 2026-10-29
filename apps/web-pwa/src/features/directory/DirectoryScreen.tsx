import { useMemo, useState } from 'react'
import { LocateFixed, Search, X } from 'lucide-react'
import FacilityCard from './FacilityCard'
import Sheet from '../../components/Sheet'
import { useI18n } from '../../i18n/i18nContext'
import { FACILITIES, distanceKm, hasEmergencyObstetricCare } from '../../services/facilitiesData'
import type { Facility } from '../../services/facilitiesData'
import { normalizeText } from '../../services/triage'

export type DirectoryFilter = 'all' | 'emergency' | 'phc' | 'general'

const FILTERS: { id: DirectoryFilter; labelKey: 'dir.filter.all' | 'dir.filter.emergency' | 'dir.filter.phc' | 'dir.filter.general'; test: (f: Facility) => boolean }[] = [
  { id: 'all', labelKey: 'dir.filter.all', test: () => true },
  { id: 'emergency', labelKey: 'dir.filter.emergency', test: hasEmergencyObstetricCare },
  { id: 'phc', labelKey: 'dir.filter.phc', test: (f) => f.facilityType === 'phc' },
  { id: 'general', labelKey: 'dir.filter.general', test: (f) => f.facilityType === 'general_hospital' },
]

type GeoStatus = 'idle' | 'loading' | 'denied'

interface DirectoryScreenProps {
  initialFilter?: DirectoryFilter
}

export default function DirectoryScreen({ initialFilter = 'all' }: DirectoryScreenProps) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<DirectoryFilter>(initialFilter)
  const [query, setQuery] = useState('')
  // Position lives only in this component's memory: never persisted, never sent anywhere.
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [geo, setGeo] = useState<GeoStatus>('idle')
  const [promptOpen, setPromptOpen] = useState(false)

  const results = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter)!
    const q = normalizeText(query)
    const rows = FACILITIES.filter(active.test)
      .filter((f) => !q || normalizeText(`${f.name} ${f.lga} ${f.state} ${f.address}`).includes(q))
      .map((f) => ({ f, km: position ? distanceKm(position.lat, position.lng, f.lat, f.lng) : undefined }))
    rows.sort((a, b) =>
      a.km !== undefined && b.km !== undefined
        ? a.km - b.km
        : Number(b.f.emergencyServices) - Number(a.f.emergencyServices) || a.f.name.localeCompare(b.f.name),
    )
    return rows
  }, [filter, query, position])

  const requestLocation = () => {
    setPromptOpen(false)
    if (!('geolocation' in navigator)) {
      setGeo('denied')
      return
    }
    setGeo('loading')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude })
        setGeo('idle')
      },
      () => setGeo('denied'),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-navy">{t('directory.title')}</h2>
        <p className="mt-0.5 text-sm text-slate-600">{t('dir.subtitle')}</p>
      </div>

      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900" role="note">
        {t('dir.dataNotice')}
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('dir.search')}
          aria-label={t('dir.search')}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('common.close')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <div role="group" aria-label={t('dir.filtersLabel')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filter === id
                ? id === 'emergency'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-teal bg-teal text-white'
                : 'border-slate-200 bg-white text-slate-dark hover:border-teal'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {t('dir.results', { count: results.length })}
          {position && <span className="ml-2 text-teal">· {t('dir.sortedNearest')}</span>}
        </p>
        {position ? (
          <button type="button" onClick={() => setPosition(null)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
            {t('dir.clearSort')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPromptOpen(true)}
            disabled={geo === 'loading'}
            className="flex items-center gap-1.5 rounded-full border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/5 disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            {geo === 'loading' ? t('dir.locLoading') : t('dir.sortNearest')}
          </button>
        )}
      </div>
      {geo === 'denied' && (
        <p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          {t('dir.locDenied')}
        </p>
      )}

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{t('dir.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {results.map(({ f, km }) => (
            <li key={f.id}>
              <FacilityCard facility={f} distanceKm={km} />
            </li>
          ))}
        </ul>
      )}

      {promptOpen && (
        <Sheet
          title={t('dir.privacy.title')}
          onClose={() => setPromptOpen(false)}
          zClass="z-50"
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => setPromptOpen(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
                {t('dir.privacy.cancel')}
              </button>
              <button type="button" onClick={requestLocation} className="flex-1 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90">
                {t('dir.privacy.allow')}
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-dark">{t('dir.privacy.body')}</p>
        </Sheet>
      )}
    </section>
  )
}

import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, CircleCheck, TriangleAlert } from 'lucide-react'
import ArticleDrawer from '../components/ArticleDrawer'
import { STAGES } from '../data/stages'
import type { StageId } from '../data/stages'
import { useI18n } from '../i18n/i18nContext'
import { db, markGuideRead } from '../services/db'
import { guideId } from '../services/seed'

export default function GuidesScreen() {
  const { language, t } = useI18n()
  const [stage, setStage] = useState<StageId>('first-trimester')
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  // Every query is keyed by language, so switching language reloads content instantly (no page refresh).
  const guides = useLiveQuery(() => db.guides.where('language').equals(language).toArray(), [language])
  const openGuide = useLiveQuery(
    () => (openSlug ? db.guides.get(guideId(openSlug, language)) : undefined),
    [openSlug, language],
  )

  const stageGuides = useMemo(() => guides?.filter((g) => g.stage === stage) ?? [], [guides, stage])
  const readCount = guides?.filter((g) => g.isRead).length ?? 0
  const total = guides?.length ?? 0

  const openArticle = (slug: string) => {
    setOpenSlug(slug)
    markGuideRead(slug).catch(() => undefined)
  }
  const closeArticle = useCallback(() => setOpenSlug(null), [])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-navy">{t('guides.title')}</h2>
        <p className="mt-0.5 text-sm text-slate-600">{t('guides.subtitle')}</p>
        {total > 0 && (
          <div className="mt-3">
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={readCount}
              aria-label={t('guides.progress', { read: readCount, total })}
            >
              <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${(readCount / total) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('guides.progress', { read: readCount, total })}</p>
          </div>
        )}
      </div>

      <div role="tablist" aria-label={t('guides.stagesLabel')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {STAGES.map((id) => {
          const selected = id === stage
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setStage(id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selected ? 'border-teal bg-teal text-white shadow' : 'border-slate-200 bg-white text-slate-dark hover:border-teal'
              }`}
            >
              {t(`stage.${id}.name`)}
            </button>
          )
        })}
      </div>

      <p className="text-xs font-medium text-slate-500">{t(`stage.${stage}.weeks`)}</p>

      {guides === undefined ? (
        <p className="py-8 text-center text-sm text-slate-500">{t('guides.loading')}</p>
      ) : stageGuides.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {t('guides.empty')}
        </p>
      ) : (
        <div role="tabpanel">
        <ul className="space-y-3">
          {stageGuides.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => openArticle(g.slug)}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-blush px-2.5 py-0.5 text-navy">{t(`category.${g.category}`)}</span>
                    {g.warning && (
                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                        <TriangleAlert className="h-3 w-3" aria-hidden />
                        {t('guides.warningBadge')}
                      </span>
                    )}
                    {g.isRead && (
                      <span className="flex items-center gap-1 text-teal">
                        <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                        {t('guides.read')}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-bold leading-snug text-navy">{g.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{g.summary}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        </div>
      )}

      {openGuide && <ArticleDrawer guide={openGuide} onClose={closeArticle} />}
    </section>
  )
}

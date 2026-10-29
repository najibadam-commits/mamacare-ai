import { useEffect, useMemo, useRef } from 'react'
import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import type { Guide } from '../services/db'
import { useI18n } from '../i18n/i18nContext'
import { toSections } from '../lib/parseContent'

interface ArticleDrawerProps {
  guide: Guide
  onClose: () => void
}

export default function ArticleDrawer({ guide, onClose }: ArticleDrawerProps) {
  const { t } = useI18n()
  const closeRef = useRef<HTMLButtonElement>(null)
  const sections = useMemo(() => toSections(guide.content), [guide.content])

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={guide.title}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('guides.closeArticle')}
        onClick={onClose}
        className="absolute inset-0 bg-slate-dark/60"
      />
      <article className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-200 bg-white px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-blush px-2.5 py-0.5 text-navy">{t(`category.${guide.category}`)}</span>
              <span className="text-slate-500">{t(`stage.${guide.stage}.name`)}</span>
            </div>
            <h2 className="mt-1.5 text-lg font-bold leading-snug text-navy">{guide.title}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 pb-8 pt-4">
          {guide.warning && (
            <div role="alert" className="flex gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-900">
              <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-600" aria-hidden />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">{t('guides.urgentTitle')}</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">{guide.warning}</p>
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed text-slate-600">{guide.summary}</p>

          <section className="rounded-2xl bg-blush p-4">
            <h3 className="text-sm font-bold text-navy">{t('guides.keyTakeaways')}</h3>
            <ul className="mt-2 space-y-2">
              {guide.keyTakeaways.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-dark">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {sections.map((section, i) => (
            <section key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              {section.heading && <h3 className="mb-2 text-base font-bold text-teal">{section.heading}</h3>}
              <div className="space-y-2 text-sm leading-relaxed text-slate-dark">
                {section.blocks.map((block, j) =>
                  block.type === 'list' ? (
                    <ul key={j} className="space-y-1.5">
                      {block.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : block.type === 'paragraph' ? (
                    <p key={j}>{block.text}</p>
                  ) : null,
                )}
              </div>
            </section>
          ))}

          <p className="text-xs text-slate-500">{t('guides.disclaimer')}</p>
        </div>
      </article>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Full Tailwind z-index class so stacked sheets can layer (kept literal for the JIT scanner). */
  zClass?: string
}

/** Bottom-sheet dialog: backdrop click / Escape to close, focus moves in, page scroll locked. */
export default function Sheet({ title, onClose, children, footer, zClass = 'z-40' }: SheetProps) {
  const { t } = useI18n()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className={`fixed inset-0 ${zClass} flex items-end justify-center`} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" tabIndex={-1} aria-label={t('common.close')} onClick={onClose} className="absolute inset-0 bg-slate-dark/60" />
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="min-w-0 flex-1 text-lg font-bold text-navy">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4" tabIndex={0}>{children}</div>
        {footer && <footer className="border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </div>
  )
}

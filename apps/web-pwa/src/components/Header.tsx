import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Settings, Siren } from 'lucide-react'
import { LANGUAGES } from '../i18n/languages'
import { useI18n } from '../i18n/i18nContext'

interface HeaderProps {
  onEmergency: () => void
  onOpenSettings: () => void
}

export default function Header({ onEmergency, onOpenSettings }: HeaderProps) {
  const { language, setLanguage, t } = useI18n()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-20 bg-navy pt-[env(safe-area-inset-top)] text-white shadow-md">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-2 px-4">
        <h1 className="text-lg font-bold tracking-tight">MamaCare AI</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEmergency}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow ring-2 ring-red-300/40 transition hover:bg-red-700 active:scale-95"
            aria-label={t('header.sosLabel')}
          >
            <Siren className="h-4 w-4" aria-hidden />
            {t('header.sos')}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label={`${t('header.languageLabel')}: ${current.label}`}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            >
              <Globe className="h-4 w-4" aria-hidden />
              {current.short}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
            {open && (
              <ul
                role="listbox"
                aria-label={t('header.selectLanguage')}
                className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl bg-white text-slate-dark shadow-lg ring-1 ring-black/5"
              >
                {LANGUAGES.map((l) => (
                  <li key={l.id} role="option" aria-selected={l.id === language}>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage(l.id)
                        setOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-blush"
                    >
                      {l.label}
                      {l.id === language && <Check className="h-4 w-4 text-teal" aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t('settings.open')}
            title={t('settings.open')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}

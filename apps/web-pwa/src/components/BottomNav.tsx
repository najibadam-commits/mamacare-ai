import { TABS } from '../lib/nav'
import { useI18n } from '../i18n/i18nContext'
import type { TabId } from '../lib/nav'

interface BottomNavProps {
  active: TabId
  onChange: (id: TabId) => void
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { t } = useI18n()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ id, labelKey, icon: Icon }) => {
          const isActive = id === active
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-teal' : 'text-slate-500 hover:text-navy'
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    isActive ? 'bg-blush' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="truncate">{t(labelKey)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

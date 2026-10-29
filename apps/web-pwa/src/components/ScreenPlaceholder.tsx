import type { LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'

interface ScreenPlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
  accent: string
}

export default function ScreenPlaceholder({ icon: Icon, title, description, accent }: ScreenPlaceholderProps) {
  const { t } = useI18n()
  return (
    <section className={`rounded-2xl p-5 ${accent}`}>
      <Icon className="mb-3 h-9 w-9" aria-hidden />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm opacity-90">{description}</p>
      <span className="mt-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
        {t('common.comingSoon')}
      </span>
    </section>
  )
}

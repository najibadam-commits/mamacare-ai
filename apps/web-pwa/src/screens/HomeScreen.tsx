import { House } from 'lucide-react'
import ScreenPlaceholder from '../components/ScreenPlaceholder'
import { useI18n } from '../i18n/i18nContext'

export default function HomeScreen() {
  const { t } = useI18n()
  return (
    <ScreenPlaceholder
      icon={House}
      title={t('home.title')}
      description={t('home.description')}
      accent="bg-navy text-white"
    />
  )
}

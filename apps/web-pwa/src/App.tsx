import { useState } from 'react'
import { WifiOff } from 'lucide-react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import GuidesScreen from './screens/GuidesScreen'
import AppointmentsScreen from './screens/AppointmentsScreen'
import AssistantScreen from './features/assistant/AssistantScreen'
import DirectoryScreen from './features/directory/DirectoryScreen'
import type { DirectoryFilter } from './features/directory/DirectoryScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import EmergencyAlertModal from './components/EmergencyAlertModal'
import type { TriageResult } from './services/triage'
import { useI18n } from './i18n/i18nContext'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useReminderEngine } from './hooks/useReminderEngine'
import type { TabId } from './lib/nav'

export default function App() {
  const { t } = useI18n()
  const online = useOnlineStatus()
  useReminderEngine()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('home')
  const [emergency, setEmergency] = useState<{ result: TriageResult | null } | null>(null)
  // Changing `key` remounts the directory so a preset filter (e.g. emergency) is applied.
  const [directory, setDirectory] = useState<{ filter: DirectoryFilter; key: number }>({ filter: 'all', key: 0 })

  const findNearestFacility = () => {
    setEmergency(null)
    setDirectory((d) => ({ filter: 'emergency', key: d.key + 1 }))
    setTab('directory')
  }

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <Header onEmergency={() => setEmergency({ result: null })} onOpenSettings={() => setSettingsOpen(true)} />

      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-xs font-medium text-amber-900">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          {t('offline.banner')}
        </div>
      )}

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">
        {tab === 'home' && <HomeScreen />}
        {tab === 'guides' && <GuidesScreen />}
        {tab === 'appointments' && <AppointmentsScreen />}
        {tab === 'assistant' && (
          <AssistantScreen onDangerSign={(result) => setEmergency({ result })} onFindFacility={findNearestFacility} />
        )}
        {tab === 'directory' && <DirectoryScreen key={directory.key} initialFilter={directory.filter} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}

      {emergency && (
        <EmergencyAlertModal result={emergency.result} onClose={() => setEmergency(null)} onFindFacility={findNearestFacility} />
      )}
    </div>
  )
}

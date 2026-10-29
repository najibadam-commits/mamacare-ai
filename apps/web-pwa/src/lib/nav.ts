import { BookOpenText, CalendarClock, Hospital, House, MessageCircleHeart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StringKey } from '../i18n/strings'

export type TabId = 'home' | 'guides' | 'appointments' | 'assistant' | 'directory'

export interface TabDef {
  id: TabId
  labelKey: StringKey
  icon: LucideIcon
}

export const TABS: TabDef[] = [
  { id: 'home', labelKey: 'nav.home', icon: House },
  { id: 'guides', labelKey: 'nav.guides', icon: BookOpenText },
  { id: 'appointments', labelKey: 'nav.appointments', icon: CalendarClock },
  { id: 'assistant', labelKey: 'nav.assistant', icon: MessageCircleHeart },
  { id: 'directory', labelKey: 'nav.directory', icon: Hospital },
]

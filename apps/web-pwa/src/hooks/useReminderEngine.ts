import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/i18nContext'
import { startReminderEngine } from '../services/notifications'

/** Runs the local reminder loop for the lifetime of the app, always using the current language. */
export function useReminderEngine() {
  const { language, t } = useI18n()
  const ctx = useRef({ language, t })
  ctx.current = { language, t }

  useEffect(() => startReminderEngine(() => ctx.current), [])
}

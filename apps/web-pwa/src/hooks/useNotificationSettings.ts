import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../services/db'
import { getPermission, NOTIFICATION_PREF_KEYS } from '../services/notifications'
import type { PermissionState } from '../services/notifications'

export function useNotificationSettings() {
  const prefs = useLiveQuery(() => db.userPreferences.bulkGet([...NOTIFICATION_PREF_KEYS]), [])
  const [permission, setPermission] = useState<PermissionState>(getPermission())

  const refreshPermission = useCallback(() => setPermission(getPermission()), [])

  useEffect(() => {
    window.addEventListener('focus', refreshPermission)
    document.addEventListener('visibilitychange', refreshPermission)
    let status: PermissionStatus | undefined
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((s) => {
        status = s
        s.onchange = refreshPermission
      })
      .catch(() => undefined)
    return () => {
      window.removeEventListener('focus', refreshPermission)
      document.removeEventListener('visibilitychange', refreshPermission)
      if (status) status.onchange = null
    }
  }, [refreshPermission])

  const consented = prefs?.[0]?.value === true
  return {
    ready: prefs !== undefined,
    permission,
    consented,
    /** Consent given AND the browser still allows notifications. */
    enabled: consented && permission === 'granted',
    discreet: prefs?.[1]?.value !== false,
    refreshPermission,
  }
}

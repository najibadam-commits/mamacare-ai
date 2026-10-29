import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { I18nContext } from './i18nContext'
import { DEFAULT_LANGUAGE, isLanguage } from './languages'
import type { Language } from './languages'
import { dictionaries } from './strings'
import type { StringKey } from './strings'
import { getPreference, setPreference } from '../services/db'

const LANGUAGE_PREF_KEY = 'language'

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  // Restore the saved language (stored in IndexedDB) after first render.
  useEffect(() => {
    let cancelled = false
    getPreference(LANGUAGE_PREF_KEY)
      .then((saved) => {
        if (!cancelled && isLanguage(saved)) setLanguageState(saved)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setPreference(LANGUAGE_PREF_KEY, lang).catch(() => undefined)
  }, [])

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let text = dictionaries[language][key] ?? dictionaries.en[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value))
      }
      return text
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

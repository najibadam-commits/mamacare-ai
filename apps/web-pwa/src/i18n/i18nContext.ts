import { createContext, useContext } from 'react'
import type { Language } from './languages'
import type { StringKey } from './strings'

export interface I18nValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

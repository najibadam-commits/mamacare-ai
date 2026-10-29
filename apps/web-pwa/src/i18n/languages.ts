export type Language = 'en' | 'ha' | 'pcm'

export const LANGUAGES: { id: Language; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ha', label: 'Hausa', short: 'HA' },
  { id: 'pcm', label: 'Nigerian Pidgin', short: 'PCM' },
]

export const DEFAULT_LANGUAGE: Language = 'en'

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.id === value)
}

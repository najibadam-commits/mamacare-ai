import { useCallback, useEffect, useState } from 'react'
import type { Language } from '../i18n/languages'
import { isSpeechSupported, speak as speakText, stopSpeaking } from '../services/speech'

/** Tracks which item (by id) is currently being read aloud. Safe on browsers without speech synthesis. */
export function useSpeech() {
  const supported = isSpeechSupported()
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const stop = useCallback(() => {
    stopSpeaking()
    setSpeakingId(null)
  }, [])

  const speak = useCallback((id: string, text: string, language: Language) => {
    const started = speakText(text, language, {
      onEnd: () => setSpeakingId((cur) => (cur === id ? null : cur)),
      onError: () => setSpeakingId((cur) => (cur === id ? null : cur)),
    })
    setSpeakingId(started ? id : null)
    return started
  }, [])

  // Never keep talking after the screen is left.
  useEffect(() => () => stopSpeaking(), [])

  return { supported, speakingId, speak, stop }
}

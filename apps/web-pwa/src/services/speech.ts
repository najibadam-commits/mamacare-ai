import type { Language } from '../i18n/languages'

/** Preferred BCP-47 tags per app language. Hausa/Pidgin fall back to the device's default voice. */
const PREFERRED_LANG: Record<Language, string[]> = {
  en: ['en-GB', 'en-US'],
  ha: ['ha'],
  pcm: [],
}

const MAX_CHUNK = 180

export interface SpeechDeps {
  synth: SpeechSynthesis
  Utterance: typeof SpeechSynthesisUtterance
}

function defaultDeps(): SpeechDeps | null {
  if (typeof window === 'undefined') return null
  if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return null
  return { synth: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance }
}

export function isSpeechSupported(deps: SpeechDeps | null = defaultDeps()): boolean {
  return deps !== null
}

/** Removes markdown-ish markers, URLs and extra whitespace so the voice reads clean prose. */
export function prepareSpeechText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^[\s>*#-]+/gm, '')
    .replace(/[*_`#]/g, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Splits text into sentence-sized pieces. Long utterances are cut off by some browsers (Chrome, ~15 s). */
export function chunkForSpeech(text: string, max = MAX_CHUNK): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? []
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > max) {
      chunks.push(current)
      current = ''
    }
    if (sentence.length > max) {
      // Rare: one very long sentence. Split on word boundaries.
      for (const word of sentence.split(' ')) {
        if (current && current.length + word.length + 1 > max) {
          chunks.push(current)
          current = ''
        }
        current = current ? `${current} ${word}` : word
      }
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/** en -> an en-GB/en-US voice if installed; ha -> a Hausa voice if installed; otherwise null (system default). */
export function pickVoice(voices: SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice | null {
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()
  for (const tag of PREFERRED_LANG[language]) {
    const t = tag.toLowerCase()
    const exact = voices.find((v) => norm(v) === t)
    if (exact) return exact
  }
  for (const tag of PREFERRED_LANG[language]) {
    const prefix = tag.toLowerCase().split('-')[0]
    const loose = voices.find((v) => norm(v).split('-')[0] === prefix)
    if (loose) return loose
  }
  return null
}

let session = 0

export function stopSpeaking(deps: SpeechDeps | null = defaultDeps()): void {
  session++ // invalidates callbacks of whatever was playing
  try {
    deps?.synth.cancel()
  } catch {
    // ignore
  }
}

export interface SpeakHandlers {
  onEnd: () => void
  onError: () => void
}

/**
 * Reads `text` aloud. Returns false (without throwing) when speech is unsupported or fails to start.
 * Any previous playback is stopped first.
 */
export function speak(
  text: string,
  language: Language,
  handlers: SpeakHandlers,
  deps: SpeechDeps | null = defaultDeps(),
): boolean {
  if (!deps) return false
  const chunks = chunkForSpeech(prepareSpeechText(text))
  if (chunks.length === 0) return false

  try {
    stopSpeaking(deps)
    const mine = session
    const voice = pickVoice(deps.synth.getVoices(), language)
    chunks.forEach((chunk, i) => {
      const u = new deps.Utterance(chunk)
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      } else if (language === 'en') {
        u.lang = 'en-GB'
      }
      u.rate = 0.95
      const last = i === chunks.length - 1
      u.onend = () => {
        if (last && mine === session) handlers.onEnd()
      }
      u.onerror = (e) => {
        // cancel() raises "canceled"/"interrupted" on queued utterances; that is not a failure.
        if (mine !== session) return
        const reason = (e as SpeechSynthesisErrorEvent).error
        if (reason === 'canceled' || reason === 'interrupted') return
        handlers.onError()
      }
      deps.synth.speak(u)
    })
    return true
  } catch {
    return false
  }
}

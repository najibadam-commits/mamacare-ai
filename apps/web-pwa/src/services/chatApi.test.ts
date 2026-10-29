import { describe, expect, it, vi } from 'vitest'
import { CHAT_ENDPOINT, parseChatResponse, sendChatMessage } from './chatApi'
import { rankGuides, searchOfflineGuidance, tokenize } from './offlineFaq'
import { SEED_GUIDES } from '../data/guides.seed'
import type { Language } from '../i18n/languages'
import { chunkForSpeech, isSpeechSupported, pickVoice, prepareSpeechText, speak, stopSpeaking } from './speech'
import type { SpeechDeps } from './speech'
import { evaluateSymptoms, listTriagePhrases } from './triage'
import { stageHint } from '../features/assistant/stageHint'

const okJson = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const goodBody = {
  answer: '- Sleep under a treated net.',
  sources: [{ title: 'Malaria in Pregnancy', category: 'malaria' }],
  disclaimer: 'Educational only.',
}

describe('sendChatMessage', () => {
  it('posts to /api/chat and returns the grounded answer', async () => {
    const fetchImpl = vi.fn(() => okJson(goodBody))
    const out = await sendChatMessage('How do I prevent malaria?', 'en', 'pregnancy', { fetchImpl, isOnline: () => true })
    expect(out.kind).toBe('answer')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(CHAT_ENDPOINT)
    expect(JSON.parse(init.body as string)).toEqual({ query: 'How do I prevent malaria?', language: 'en', userStage: 'pregnancy' })
  })

  it('omits userStage when not provided', async () => {
    const fetchImpl = vi.fn(() => okJson(goodBody))
    await sendChatMessage('What foods help prevent anemia?', 'en', undefined, { fetchImpl, isOnline: () => true })
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('userStage')
  })

  it('blocks the network call for every emergency phrase in every language', () => {
    const phrases = listTriagePhrases()
    expect(phrases.length).toBeGreaterThan(20)
    return Promise.all(
      phrases.map(async ({ phrase, language }) => {
        const fetchImpl = vi.fn(() => okJson(goodBody))
        const out = await sendChatMessage(`please help ${phrase}`, language, undefined, { fetchImpl, isOnline: () => true })
        expect(out.kind, phrase).toBe('emergency')
        expect(fetchImpl, phrase).not.toHaveBeenCalled()
      }),
    )
  })

  it('returns the triage result for an emergency', async () => {
    const fetchImpl = vi.fn()
    const out = await sendChatMessage('I am bleeding heavily and I am pregnant', 'en', undefined, { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(out.kind).toBe('emergency')
    if (out.kind === 'emergency') expect(out.triage.critical).toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does not send the starter-chip questions to triage', () => {
    for (const q of ['What foods help prevent anemia?', 'How do I prevent malaria?', 'When do babies get BCG vaccine?']) {
      expect(evaluateSymptoms(q, 'en').critical, q).toBe(false)
    }
  })

  it('skips the network when offline', async () => {
    const fetchImpl = vi.fn()
    const out = await sendChatMessage('How do I prevent malaria?', 'en', undefined, { fetchImpl: fetchImpl as unknown as typeof fetch, isOnline: () => false })
    expect(out).toEqual({ kind: 'offline', reason: 'offline' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('times out after the configured delay instead of hanging', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))),
    )
    const out = await sendChatMessage('How do I prevent malaria?', 'en', undefined, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
      timeoutMs: 20,
    })
    expect(out).toEqual({ kind: 'offline', reason: 'timeout' })
  })

  it.each([
    ['network error', () => Promise.reject(new TypeError('Failed to fetch')), 'unreachable'],
    ['502 from the proxy', () => okJson({}, 502), 'unreachable'],
    ['404 from a static host', () => okJson({}, 404), 'unreachable'],
    ['non-JSON body', () => Promise.resolve(new Response('<html>', { status: 200 })), 'unreachable'],
    ['wrong shape', () => okJson({ nope: true }), 'bad-response'],
  ])('falls back instead of throwing on %s', async (_name, impl, reason) => {
    const out = await sendChatMessage('How do I prevent malaria?', 'en', undefined, { fetchImpl: impl as unknown as typeof fetch, isOnline: () => true })
    expect(out).toEqual({ kind: 'offline', reason })
  })
})

describe('parseChatResponse', () => {
  it('accepts a valid body and drops malformed sources', () => {
    const parsed = parseChatResponse({ answer: 'x', sources: [{ title: 'A', category: 'c' }, null, { category: 'no title' }], disclaimer: 'd' })
    expect(parsed?.sources).toEqual([{ title: 'A', category: 'c' }])
  })
  it('rejects empty or missing answers', () => {
    expect(parseChatResponse({ answer: '  ' })).toBeNull()
    expect(parseChatResponse(null)).toBeNull()
  })
})

describe('offline FAQ matching', () => {
  const guides = (lang: Language) => SEED_GUIDES.map((g) => ({ slug: g.slug, category: g.category, ...g.translations[lang] }))

  it('finds the BCG schedule for the BCG chip', () => {
    const cards = rankGuides('When do babies get BCG vaccine?', guides('en'))
    expect(cards[0]?.slug).toBe('newborn-immunization-schedule')
  })
  it('finds malaria guidance for the malaria chip', () => {
    expect(rankGuides('How do I prevent malaria?', guides('en')).map((c) => c.slug)).toContain('malaria-and-iron-second-trimester')
  })
  it('finds nutrition/iron guidance for the anaemia chip (US spelling)', () => {
    expect(rankGuides('What foods help prevent anemia?', guides('en')).length).toBeGreaterThan(0)
  })
  it.each(['ha', 'pcm'] as const)('matches in %s using that language guides', (lang) => {
    const q = lang === 'ha' ? 'rigakafin BCG' : 'BCG injection for pikin'
    expect(rankGuides(q, guides(lang))[0]?.slug).toBe('newborn-immunization-schedule')
  })
  it('returns nothing for off-topic questions', () => {
    expect(rankGuides('How do I fix my car engine?', guides('en'))).toEqual([])
    expect(rankGuides('', guides('en'))).toEqual([])
  })
  it('tokenizer folds spelling variants', () => {
    expect(tokenize('Anemia')).toEqual(tokenize('anaemia'))
  })
  it('falls back to the bundled guides when IndexedDB is unavailable (node)', async () => {
    const cards = await searchOfflineGuidance('When do babies get BCG vaccine?', 'en')
    expect(cards.length).toBeGreaterThan(0)
  })
  it('falls back to English when the user language has no match', async () => {
    const cards = await searchOfflineGuidance('When do babies get BCG vaccine?', 'ha')
    expect(cards.length).toBeGreaterThan(0)
  })
})

describe('speech', () => {
  function fakeDeps(voices: Partial<SpeechVoice>[] = []) {
    const spoken: { text: string; lang?: string; voice?: unknown; onend?: () => void; onerror?: (e: unknown) => void }[] = []
    class FakeUtterance {
      text: string
      lang = ''
      voice: unknown = null
      rate = 1
      onend?: () => void
      onerror?: (e: unknown) => void
      constructor(text: string) {
        this.text = text
      }
    }
    const synth = {
      getVoices: () => voices as SpeechSynthesisVoice[],
      speak: (u: FakeUtterance) => spoken.push(u),
      cancel: vi.fn(),
    }
    return { deps: { synth, Utterance: FakeUtterance } as unknown as SpeechDeps, spoken, synth }
  }
  type SpeechVoice = { lang: string; name: string }

  it('is safely unsupported without speechSynthesis', () => {
    expect(isSpeechSupported(null)).toBe(false)
    expect(speak('hello', 'en', { onEnd: () => undefined, onError: () => undefined }, null)).toBe(false)
    expect(() => stopSpeaking(null)).not.toThrow()
  })

  it('cleans text and chunks long answers', () => {
    expect(prepareSpeechText('- First point.\n- Second point.')).toBe('First point. Second point.')
    const chunks = chunkForSpeech('Sentence one is here. '.repeat(40))
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.length <= 180)).toBe(true)
  })

  it('prefers en-GB then en-US voices, and the default voice for Pidgin', () => {
    const voices = [{ lang: 'fr-FR' }, { lang: 'en_US' }, { lang: 'en-GB' }] as SpeechSynthesisVoice[]
    expect(pickVoice(voices, 'en')?.lang).toBe('en-GB')
    expect(pickVoice([{ lang: 'en-US' }] as SpeechSynthesisVoice[], 'en')?.lang).toBe('en-US')
    expect(pickVoice(voices, 'pcm')).toBeNull()
    expect(pickVoice(voices, 'ha')).toBeNull()
    expect(pickVoice([{ lang: 'ha-NG' }] as SpeechSynthesisVoice[], 'ha')?.lang).toBe('ha-NG')
  })

  it('speaks via the queue and reports the end of the last chunk', () => {
    const { deps, spoken, synth } = fakeDeps([{ lang: 'en-GB', name: 'x' }])
    const onEnd = vi.fn()
    expect(speak('Hello there. Stay hydrated.', 'en', { onEnd, onError: vi.fn() }, deps)).toBe(true)
    expect(synth.cancel).toHaveBeenCalled()
    expect(spoken.length).toBeGreaterThan(0)
    spoken[spoken.length - 1].onend?.()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('ignores the "canceled" error raised by stop and reports real errors', () => {
    const { deps, spoken } = fakeDeps()
    const onError = vi.fn()
    speak('Some text here.', 'en', { onEnd: vi.fn(), onError }, deps)
    spoken[0].onerror?.({ error: 'canceled' })
    expect(onError).not.toHaveBeenCalled()
    spoken[0].onerror?.({ error: 'synthesis-failed' })
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the browser rejects speak()', () => {
    const { deps } = fakeDeps()
    ;(deps.synth as unknown as { speak: () => void }).speak = () => {
      throw new Error('not-allowed')
    }
    expect(speak('Hello there.', 'en', { onEnd: vi.fn(), onError: vi.fn() }, deps)).toBe(false)
  })
})

describe('stageHint', () => {
  it('maps app stages to the RAG hint', () => {
    expect(stageHint('')).toBeUndefined()
    expect(stageHint('second-trimester')).toBe('pregnancy')
    expect(stageHint('postnatal')).toBe('postnatal')
    expect(stageHint('baby-care')).toBe('newborn')
  })
})

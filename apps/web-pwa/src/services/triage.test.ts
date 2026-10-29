import { describe, expect, it } from 'vitest'
import { evaluateSymptoms, listTriagePhrases, normalizeText } from './triage'
import type { DangerSignId } from './triage'

/** Turn a compiled pattern into a sample sentence a user could type. */
const sample = (phrase: string) => phrase.replace(/\*/g, 'zz')

describe('normalizeText', () => {
  it('folds case, Hausa hooked letters, accents, apostrophes and punctuation', () => {
    expect(normalizeText('Farfaɗiya!!')).toBe('farfadiya')
    expect(normalizeText("I CAN'T feel my baby")).toBe('i cant feel my baby')
    expect(normalizeText('Ƙarfe, ɓoye – ƴa')).toBe('karfe boye ya')
  })
})

describe('every phrase in every language triggers its danger sign', () => {
  const phrases = listTriagePhrases()
  it('has a meaningful number of phrases in all three languages', () => {
    for (const lang of ['en', 'ha', 'pcm'] as const) {
      expect(phrases.filter((p) => p.language === lang).length).toBeGreaterThan(40)
    }
  })

  it.each(phrases.map((p) => [p.id, p.language, p.phrase] as const))('%s [%s] "%s"', (id, language, phrase) => {
    for (const uiLang of ['en', 'ha', 'pcm']) {
      const r = evaluateSymptoms(`please help, ${sample(phrase).toUpperCase()} since morning.`, uiLang)
      expect(r.critical).toBe(true)
      expect(r.matchedSymptoms).toContain(id)
      expect(['emergency', 'urgent']).toContain(r.urgency)
      expect(r.recommendedAction.length).toBeGreaterThan(10)
      expect(language).toBeTruthy()
    }
  })
})

describe('required examples from the spec', () => {
  const cases: [string, DangerSignId, 'emergency' | 'urgent'][] = [
    ['I am bleeding', 'severe_bleeding', 'emergency'],
    ['Ina zubar jini', 'severe_bleeding', 'emergency'],
    ['blood dey commot', 'severe_bleeding', 'emergency'],
    ['blurred vision', 'pre_eclampsia', 'emergency'],
    ['ciwon kai mai tsanani', 'pre_eclampsia', 'emergency'],
    ['my eye dey blur', 'pre_eclampsia', 'emergency'],
    ['she is having fits', 'convulsions', 'emergency'],
    ['farfadiya', 'convulsions', 'emergency'],
    ['farfaɗiya', 'convulsions', 'emergency'],
    ['body dey shake', 'convulsions', 'emergency'],
    ['my water broke', 'waters_broke', 'emergency'],
    ['ruwa ya fashe', 'waters_broke', 'emergency'],
    ['water don break', 'waters_broke', 'emergency'],
    ['baby is not moving', 'reduced_fetal_movement', 'emergency'],
    ['jariri ya daina motsi', 'reduced_fetal_movement', 'emergency'],
    ['baby no dey move', 'reduced_fetal_movement', 'emergency'],
    ['high fever with chills', 'fever_malaria', 'urgent'],
    ['zazzabi mai zafi da jin sanyi', 'fever_malaria', 'urgent'],
    ['body dey hot and I dey shiver', 'fever_malaria', 'urgent'],
    ['severe abdominal pain after delivery', 'postpartum_complication', 'emergency'],
    ['foul smelling lochia', 'postpartum_complication', 'emergency'],
    ['ciwon ciki mai tsanani', 'postpartum_complication', 'emergency'],
    ['belle dey pain me well well', 'postpartum_complication', 'emergency'],
  ]
  it.each(cases)('"%s" -> %s (%s)', (text, id, urgency) => {
    const r = evaluateSymptoms(text, 'en')
    expect(r.critical).toBe(true)
    expect(r.matchedSymptoms).toContain(id)
    expect(r.urgency).toBe(urgency)
  })
})

describe('behaviour', () => {
  it('is deterministic', () => {
    const a = evaluateSymptoms('Blood dey commot and my eye dey blur', 'pcm')
    const b = evaluateSymptoms('Blood dey commot and my eye dey blur', 'pcm')
    expect(a).toEqual(b)
  })
  it('detects several signs and leads with an emergency', () => {
    const r = evaluateSymptoms('I have a fever and I am bleeding', 'en')
    expect(r.matchedSymptoms).toEqual(expect.arrayContaining(['fever_malaria', 'severe_bleeding']))
    expect(r.urgency).toBe('emergency')
    expect(r.primarySign).toBe('severe_bleeding')
  })
  it('scans all languages regardless of the language argument, and localises the output', () => {
    const r = evaluateSymptoms('Ina zubar jini', 'en')
    expect(r.critical).toBe(true)
    expect(r.matches[0].matchedLanguage).toBe('ha')
    expect(r.matches[0].label).toBe('Heavy or abnormal bleeding')
    expect(evaluateSymptoms('Ina zubar jini', 'ha').matches[0].label).toContain('Zubar jini')
    expect(evaluateSymptoms('Ina zubar jini', 'xx').critical).toBe(true) // unknown language falls back to English
  })
  it('treats a plain headache or swelling as urgent, not emergency', () => {
    expect(evaluateSymptoms('I have a headache', 'en').urgency).toBe('urgent')
    expect(evaluateSymptoms('face don swell', 'pcm').urgency).toBe('urgent')
  })
  it('does not fire on benign text', () => {
    for (const q of [
      '', '   ', 'hello', 'I feel good today', 'what vaccines does my baby need', 'how do I prepare for delivery',
      'I fit go clinic tomorrow', 'my baby is kicking a lot', 'baby dey move well', 'Ina jin dadi', 'jariri yana motsi sosai',
      'how to eat well in pregnancy',
    ]) {
      const r = evaluateSymptoms(q, 'en')
      expect(r.critical, q).toBe(false)
      expect(r.urgency).toBe('none')
      expect(r.matches).toHaveLength(0)
    }
  })
  it('does not suppress negations (fail-safe)', () => {
    expect(evaluateSymptoms('I am not bleeding', 'en').critical).toBe(true)
  })
})

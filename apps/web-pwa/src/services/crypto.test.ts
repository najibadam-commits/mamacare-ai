import { describe, expect, it } from 'vitest'
import { EncryptionUnavailableError, createFieldCrypto, isEncrypted } from './crypto'
import type { KeyStore } from './crypto'

function memoryStore(): KeyStore & { saved: number; key?: CryptoKey } {
  const s = {
    saved: 0,
    key: undefined as CryptoKey | undefined,
    async load() {
      return s.key
    },
    async save(k: CryptoKey) {
      s.key = k
      s.saved++
    },
    async clear() {
      s.key = undefined
    },
  }
  return s
}

describe('field encryption (AES-GCM 256)', () => {
  it('round-trips text and never stores plaintext', async () => {
    const c = createFieldCrypto(memoryStore())
    const stored = await c.encrypt('Ask about my blood pressure readings', 'appointment.notes')
    expect(isEncrypted(stored)).toBe(true)
    expect(stored).not.toContain('blood')
    expect(await c.decrypt(stored, 'appointment.notes')).toBe('Ask about my blood pressure readings')
  })

  it('uses a fresh random IV every time', async () => {
    const c = createFieldCrypto(memoryStore())
    const a = await c.encrypt('same text', 'ctx')
    const b = await c.encrypt('same text', 'ctx')
    expect(a).not.toBe(b)
  })

  it('handles unicode (Hausa letters, emoji)', async () => {
    const c = createFieldCrypto(memoryStore())
    const text = 'Ƙarfe, ɗan ɓoye ƴar — 🤰'
    expect(await c.decrypt(await c.encrypt(text, 'x'), 'x')).toBe(text)
  })

  it('leaves empty strings empty and passes legacy plaintext through', async () => {
    const c = createFieldCrypto(memoryStore())
    expect(await c.encrypt('', 'x')).toBe('')
    expect(await c.decrypt('old plaintext note', 'x')).toBe('old plaintext note')
  })

  it('creates the key once, as a non-extractable AES-GCM 256 key', async () => {
    const store = memoryStore()
    const c = createFieldCrypto(store)
    await Promise.all([c.encrypt('a', 'x'), c.encrypt('b', 'x'), c.encrypt('c', 'x')])
    expect(store.saved).toBe(1)
    expect(store.key?.extractable).toBe(false)
    expect((store.key?.algorithm as AesKeyAlgorithm).length).toBe(256)
    expect(store.key?.algorithm.name).toBe('AES-GCM')
  })

  it('binds ciphertext to its field: moving it elsewhere fails to decrypt', async () => {
    const c = createFieldCrypto(memoryStore())
    const stored = await c.encrypt('08031234567', 'pref:emergency.contact')
    expect(await c.decrypt(stored, 'appointment.notes')).toBe('')
  })

  it('detects tampering', async () => {
    const c = createFieldCrypto(memoryStore())
    const stored = await c.encrypt('secret note', 'x')
    const last = stored.slice(-6, -2)
    const tampered = stored.replace(last, last === 'AAAA' ? 'BBBB' : 'AAAA')
    expect(await c.decrypt(tampered, 'x')).toBe('')
  })

  it('cannot decrypt after the key is destroyed (crypto-shredding)', async () => {
    const store = memoryStore()
    const c = createFieldCrypto(store)
    const stored = await c.encrypt('note', 'x')
    await c.destroyKey()
    expect(store.key).toBeUndefined()
    expect(await c.decrypt(stored, 'x')).toBe('') // a brand-new random key is generated; old data is gone
  })

  it('fails closed (never plaintext) when Web Crypto is unavailable', async () => {
    const c = createFieldCrypto(memoryStore(), null)
    expect(c.available()).toBe(false)
    await expect(c.encrypt('note', 'x')).rejects.toBeInstanceOf(EncryptionUnavailableError)
  })
})

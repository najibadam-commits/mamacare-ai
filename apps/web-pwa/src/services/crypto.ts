/**
 * Client-side field encryption (AES-GCM, 256-bit) using the browser's native Web Crypto API.
 *
 * Threat model, stated honestly: the key is a random 256-bit CSPRNG value generated on this
 * device and stored as a NON-EXTRACTABLE CryptoKey in its own IndexedDB database. Sensitive
 * fields therefore never sit in browser storage as readable plaintext (a copied database file,
 * a storage dump, or a casual look in DevTools shows only ciphertext), and "Delete All My Data"
 * destroys the key, which makes any leftover ciphertext unrecoverable. It does NOT protect
 * against someone using the unlocked app, malware running as the user, or a malicious script
 * on this origin (the strict CSP is the defence for that). There is no passphrase by design:
 * this protects data at rest, not against a person holding the unlocked phone.
 *
 * Stored format: `enc:v1:<iv, base64>:<ciphertext+tag, base64>`. The field name is bound in as
 * AES-GCM additional data, so a ciphertext copied into a different field fails to decrypt.
 */
const PREFIX = 'enc:v1:'
const KEYSTORE_DB = 'mamacare-keystore'
const KEYSTORE_NAME = 'keys'
const KEY_ID = 'master'
const IV_BYTES = 12

export class EncryptionUnavailableError extends Error {
  constructor(message = 'Encryption is not available in this browser or connection (a secure context is required).') {
    super(message)
    this.name = 'EncryptionUnavailableError'
  }
}

/** Where the master key lives. Injectable so tests can run without IndexedDB. */
export interface KeyStore {
  load(): Promise<CryptoKey | undefined>
  save(key: CryptoKey): Promise<void>
  clear(): Promise<void>
}

const toBase64 = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
const fromBase64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function openKeystore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(KEYSTORE_DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(KEYSTORE_NAME)
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

/** Default key store: a dedicated IndexedDB database holding one non-extractable CryptoKey. */
export function createIdbKeyStore(): KeyStore {
  return {
    async load() {
      const database = await openKeystore()
      try {
        return (await idbRequest(database.transaction(KEYSTORE_NAME).objectStore(KEYSTORE_NAME).get(KEY_ID))) as CryptoKey | undefined
      } finally {
        database.close()
      }
    },
    async save(key) {
      const database = await openKeystore()
      try {
        const tx = database.transaction(KEYSTORE_NAME, 'readwrite')
        tx.objectStore(KEYSTORE_NAME).put(key, KEY_ID)
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error)
        })
      } finally {
        database.close()
      }
    },
    async clear() {
      if (typeof indexedDB === 'undefined') return
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(KEYSTORE_DB)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
        req.onblocked = () => resolve() // closes as soon as the other connection does
      })
    },
  }
}

export interface FieldCrypto {
  /** True when this browser can encrypt (Web Crypto + IndexedDB, secure context). */
  available(): boolean
  /** Encrypts text. Empty strings stay empty. Throws EncryptionUnavailableError if unsupported. */
  encrypt(plaintext: string, context: string): Promise<string>
  /** Decrypts a value from `encrypt`. Legacy plaintext (no prefix) is returned unchanged. Returns '' if the key is gone/corrupt. */
  decrypt(stored: string, context: string): Promise<string>
  /** Forgets the cached key and deletes it from the key store (crypto-shredding). */
  destroyKey(): Promise<void>
}

export function createFieldCrypto(
  store: KeyStore,
  subtle: SubtleCrypto | null = globalThis.crypto?.subtle ?? null,
): FieldCrypto {
  let keyPromise: Promise<CryptoKey> | undefined
  const enc = new TextEncoder()
  const dec = new TextDecoder()

  const available = () => !!subtle && typeof globalThis.crypto?.getRandomValues === 'function'

  const getKey = (): Promise<CryptoKey> => {
    if (!subtle) return Promise.reject(new EncryptionUnavailableError())
    keyPromise ??= (async () => {
      const existing = await store.load()
      if (existing) return existing
      // Random 256-bit key from the device CSPRNG; extractable=false so scripts can never read the raw bytes.
      const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
      await store.save(key)
      return key
    })().catch((err) => {
      keyPromise = undefined
      throw err instanceof EncryptionUnavailableError ? err : new EncryptionUnavailableError(String(err?.message ?? err))
    })
    return keyPromise
  }

  return {
    available,
    async encrypt(plaintext, context) {
      if (plaintext === '') return ''
      const key = await getKey()
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
      const ct = await subtle!.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(context) }, key, enc.encode(plaintext))
      return `${PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(ct))}`
    },
    async decrypt(stored, context) {
      if (!isEncrypted(stored)) return stored
      try {
        const [ivB64, ctB64] = stored.slice(PREFIX.length).split(':')
        const key = await getKey()
        const plain = await subtle!.decrypt(
          { name: 'AES-GCM', iv: fromBase64(ivB64), additionalData: enc.encode(context) },
          key,
          fromBase64(ctB64),
        )
        return dec.decode(plain)
      } catch {
        return ''
      }
    },
    async destroyKey() {
      keyPromise = undefined
      await store.clear()
    },
  }
}

/** App-wide instance backed by IndexedDB. */
export const fieldCrypto: FieldCrypto = createFieldCrypto(
  typeof indexedDB === 'undefined' ? { load: async () => undefined, save: async () => undefined, clear: async () => undefined } : createIdbKeyStore(),
)

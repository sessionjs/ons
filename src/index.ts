import argon2, { ArgonType } from 'argon2-browser'
import { blake2b } from '@noble/hashes/blake2';
import { xchacha20poly1305 } from "@noble/ciphers/chacha"
import { xsalsa20poly1305 } from "@noble/ciphers/salsa"

const ED25519_PUBLIC_KEY_LENGTH = 32
const SESSION_PUBLIC_KEY_BINARY_LENGTH = 1 + ED25519_PUBLIC_KEY_LENGTH
const sodium = {
  crypto_secretbox_MACBYTES: 16,
  crypto_pwhash_SALTBYTES: 16,
  crypto_aead_xchacha20poly1305_ietf_KEYBYTES: 32,
  crypto_pwhash_OPSLIMIT_MODERATE: 3,
  crypto_pwhash_MEMLIMIT_MODERATE: 268435456,
  crypto_secretbox_NONCEBYTES: 24,
  crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: 24
} as const

/** Resolve Session ONS name to Session ID.
 * Fetches public daemon, returns string with decrypted value.
 * - If ONS is not found, returns null.
 * - If ONS is invalid, throws error.
 * - If there was an error during fetch or value decryption, throws error.
 * You can set custom **wallet** daemon which supports JSON_RPC by passing options object with daemon string in the following format:
 * `http://public-eu.optf.ngo:22023`
 **/
export async function resolve(ons: string, options?: { daemon: string }): Promise<string | null> {
  validateONS(ons)
  validateOptions(options)
  const daemon = options?.daemon ?? 'http://public-eu.optf.ngo:22023'
  const nameHash = generateOnsHash(ons)
  const nameHashBase64 = uint8ArrayToBase64(nameHash)

  const request = await fetch(daemon + '/json_rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '0',
      method: 'ons_resolve',
      params: {
        name_hash: nameHashBase64,
        type: 0
      }
    }),
    redirect: 'follow'
  }).then((res) => res.json() as Promise<{ result: { encrypted_value: string; nonce: string } }>)
  if (!('encrypted_value' in request.result)) {
    return null
  }
  const nonceHex = request.result.nonce ?? ''
  const encryptedValueHex = request.result.encrypted_value
  const encryptedMessageHex = encryptedValueHex.concat(nonceHex)
  const decryptedValue = await decryptONSValue(encryptedMessageHex, ons)
  if (decryptedValue === null) return decryptedValue
  return decryptedValue && uint8ArrayToHex(decryptedValue)
}

export function isOnsValid(ons: string) {
  return /^\w([\w-]*[\w])?$/.test(ons)
}

export function validateONS(ons: string) {
  if (!isOnsValid(ons)) {
    throw new Error('Invalid ONS name')
  }
}

function validateOptions(options?: { daemon?: string }) {
  if (options) {
    if (options.daemon) {
      try {
        new URL(options.daemon)
      } catch {
        throw new Error('Invalid daemon URL')
      }
      if (options.daemon.trim().endsWith('/')) {
        options.daemon = options.daemon.trim().slice(0, -1)
      }
    }
  }
}

/**
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 *
 * Generates blake2 hash from ONS name for database search.
 */
export function generateOnsHash(ons: string): Uint8Array {
  return blake2b(new TextEncoder().encode(ons), {
    dkLen: 32
  })
}

/**
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 *
 * Decrypts concatenated encrypted value + nonce using unhashed name to Session ID.
 */
export async function decryptONSValue(encryptedMessageHex: string, ons: string): Promise<Uint8Array | null> {
  const encryptedMessage = hexToUint8Array(encryptedMessageHex)
  const legacyFormat =
    encryptedMessage.length === SESSION_PUBLIC_KEY_BINARY_LENGTH + sodium.crypto_secretbox_MACBYTES
  try {
    const key = await generateKey(ons, legacyFormat ? 'argon2id13' : 'blake2b')
    if (legacyFormat) {
      return decryptSecretboxWithKey(encryptedMessage, key)
    } else {
      const [encryptedValue, nonce] = splitEncryptedMessage(encryptedMessage)
      return decryptXChachaWithKey(encryptedValue, nonce, key)
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'could not verify data') {
      return null
    } else {
      throw e
    }
  }
}

/**
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 *
 * Generates decryption key from ons using either modern (blake2b) or legacy (argon2id13) algorithm.
 */
export async function generateKey(ons: string, algorithm: 'blake2b' | 'argon2id13'): Promise<Uint8Array> {
  const name = new TextEncoder().encode(ons)
  if (algorithm === 'blake2b') {
    const hashedKey = blake2b(name, {
      dkLen: 32,
      key: generateOnsHash(ons)
    })
    return hashedKey
  } else {
    const hashedKey = await argon2.hash({
      salt: new Uint8Array(sodium.crypto_pwhash_SALTBYTES),
      pass: name,
      type: ArgonType.Argon2id,
      time: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      parallelism: 1,
      mem: sodium.crypto_pwhash_MEMLIMIT_MODERATE / 1024,
      hashLen: sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
    })
    return hashedKey.hash
  }
}

/**
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 *
 * Decrypts modern format encrypted value using derived nonce and generated key.
 */
export function decryptXChachaWithKey(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array {
  const xchacha = xchacha20poly1305(key, nonce)
  const decrypted = xchacha.decrypt(message)
  if (!decrypted) {
    throw new Error('XChaCha20Poly1305 decryption failed')
  }
  return decrypted
}

/**
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 *
 * Decrypts legacy format encrypted value using derived nonce and generated key.
 */
export function decryptSecretboxWithKey(message: Uint8Array, key: Uint8Array): Uint8Array {
  let xsalsa = xsalsa20poly1305(key, new Uint8Array(24))
  const decrypted = xsalsa.decrypt(message)
  if (!decrypted) {
    throw new Error('XSalsa20Poly1305 decryption failed')
  }
  return decrypted
}

/**
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 *
 * Utility function that splits encrypted message into value and nonce.
 */
export function splitEncryptedMessage(encryptedMessage: Uint8Array): [Uint8Array, Uint8Array] {
  const messageLength = encryptedMessage.length - sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  const nonce = encryptedMessage.subarray(messageLength)
  const encryptedValue = encryptedMessage.subarray(0, messageLength)
  return [encryptedValue, nonce]
}

// Utils

export function uint8ArrayToBase64(array: Uint8Array): string {
  const binaryString = Array.from(array)
    .map((byte) => String.fromCharCode(byte))
    .join('')
  return btoa(binaryString)
}

export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length')
  }
  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return array
}

export function uint8ArrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

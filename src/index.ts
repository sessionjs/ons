import blake2 from 'blake2b'
import sodium from 'libsodium-wrappers-sumo'
import { ready } from 'libsodium-wrappers-sumo'

const ED25519_PUBLIC_KEY_LENGTH = 32
const SESSION_PUBLIC_KEY_BINARY_LENGTH = 1 + ED25519_PUBLIC_KEY_LENGTH

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
  await ready
  const daemon = options?.daemon ?? 'http://public-eu.optf.ngo:22023'
  const nameHash = await generateOnsHash(ons)
  const request = await fetch(daemon + '/json_rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'jsonrpc': '2.0',
      'id': '0',
      'method': 'ons_resolve',
      'params': {
        'name_hash': nameHash,
        'type': 0
      }
    }),
    redirect: 'follow'
  })
    .then(res => res.json() as Promise<{ result: { encrypted_value: string, nonce: string } }>)
  if (!('encrypted_value' in request.result)) {
    return null
  }
  const nonce = request.result.nonce ?? ''
  const value = request.result.encrypted_value
  const encrypted = value.concat(nonce)
  const decrypted = await decryptONSValue(encrypted, ons)
  return decrypted
}

function validateONS(ons: string) {
  if (!ons.match(/^\w([\w-]*[\w])?$/)) {
    throw new Error('Invalid ONS name')
  }
}

function validateOptions(options?: { daemon?: string }) {
  if(options) {
    if(options.daemon) {
      try {
        new URL(options.daemon)
      } catch(e) {
        throw new Error('Invalid daemon URL')
      }
      if(options.daemon.trim().endsWith('/')) {
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
export function generateOnsHash(input: string) {
  return Buffer.from(blake2(32)
    .update(Buffer.from(input))
    .digest('binary')).toString('base64')
}

/** 
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 * 
 * Decrypts concatenated encrypted value + nonce using unhashed name to Session ID.
*/
export function decryptONSValue(value: string, unhashedName: string) {
  const encryptedValue = Buffer.from(value, 'hex')
  const legacyFormat = encryptedValue.length === SESSION_PUBLIC_KEY_BINARY_LENGTH + sodium.crypto_secretbox_MACBYTES
  try {
    const key = generateKey(unhashedName, legacyFormat ? 'argon2id13' : 'blake2b')
    const [message, nonce] = splitEncryptedValue(encryptedValue, legacyFormat)
    if (legacyFormat) {
      return decryptSecretboxWithKey(message, nonce, key)
    } else {
      return decryptXChachaWithKey(message, nonce, key)
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
 * Decrypts modern format encrypted value using derived nonce and generated key.
*/
export function decryptXChachaWithKey(message: Buffer, nonce: Buffer, key: Buffer) {
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    message,
    null,
    nonce,
    key,
    'hex'
  )
}

/** 
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 * 
 * Decrypts legacy format encrypted value using derived nonce and generated key.
*/
export function decryptSecretboxWithKey(message: Buffer, nonce: Buffer, key: Buffer) {
  return sodium.crypto_secretbox_open_easy(
    message,
    nonce,
    key,
    'hex'
  )
}

/** 
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 * 
 * Generates key from unhashed name using either modern (blake2b) or legacy (argon2id13) algorithm.
*/
export function generateKey(unhashedName: string, algorithm: 'blake2b' | 'argon2id13') {
  if (algorithm === 'blake2b') {
    const key = blake2(32)
      .update(Buffer.from(unhashedName))
      .digest('binary')
    return Buffer.from(blake2(32, key)
      .update(Buffer.from(unhashedName))
      .digest('binary'))
  } else {
    const OLD_ENC_SALT = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES)
    return Buffer.from(sodium.crypto_pwhash(
      sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
      Buffer.from(unhashedName),
      OLD_ENC_SALT,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    ))
  }
}

/** 
 * ⚠️ **Advanced use.** You might be looking for `resolve` function.
 * 
 * Utility function that splits encrypted value into message and nonce.
*/
export function splitEncryptedValue(encryptedValue: Buffer, legacyFormat: boolean): [Buffer, Buffer] {
  if (legacyFormat) {
    return [encryptedValue, Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)]
  } else {
    const messageLength = encryptedValue.length - sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
    const nonce = encryptedValue.subarray(messageLength)
    const message = encryptedValue.subarray(0, messageLength)
    return [message, nonce]
  }
}

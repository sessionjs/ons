# @session.js/ons

Resolve Session ONS names to Session IDs in Node.js/Bun/browser

```ts
import { resolve } from '@session.js/ons'

await resolve('keejef') // => 05d871fc80ca007eed9b2f4df72853e2a2d5465a92fcb1889fb5c84aa2833b3b40

await resolve('hloth', {
  daemon: 'http://public-eu.optf.ngo:22023'
}) // => 057aeb66e45660c3bdfb7c62706f6440226af43ec13f3b6f899c1dd4db1b8fce5b

await resolve('non-existing-but-valid-ons-name') // => null

await resolve('invalid ons name') // => throws `new Error('Invalid ONS name')`
```

- ✅ Supports both modern (blake2b) and legacy (argon2) formats of encrypted value
- ✅ Works in browser
- ✅ Works on server (Node.js & Bun)
- ✅ Works on edge (Cloudflare workers)
- ✅ Input validation
- ✅ TypeScript definitions
- ✅ Tested with bun:test

This library is isomorphic meaning it runs everywhere, in every environment where WASM is supported: browser, server, edge. This is possible thanks to [tweetnacl](https://www.npmjs.com/package/tweetnacl), [@stablelib/xchacha20poly1305](https://www.npmjs.com/package/@stablelib/xchacha20poly1305), [argon2-browser](https://www.npmjs.com/package/argon2-browser) which were implemented instead of [libsodium-wrappers](https://www.npmjs.com/package/libsodium-wrappers) dependency.

## Advanced use

Every function used in algorithm is exported, so you can modify resolving algorithm, for example, to control server fetch.

Under the hood, the `resolve` function:
1. Generates hash using `generateOnsHash` function
2. fetches public daemon using `fetch` function from globalThis
3. decrypts value with `decryptONSValue` function
   1. decryptONSValue function generates key with `generateKey` function
   2. splits encoded value to message+nonce using `splitEncryptedValue` function
   3. depending on whether it's legacy format or not, it uses either `decryptSecretboxWithKey` or `decryptXChachaWithKey`

Make sure you're awaiting `ready` from libsodium-wrappers-sumo if you're getting errors like `sodium.crypto_aead_xchacha20poly1305_ietf_decrypt is not a function.`

## Made for session.js

Use Session messenger programmatically with [Session.js](https://github.com/sessionjs/client): Session bots, custom Session clients, and more.

## Donate

[hloth.dev/donate](https://hloth.dev/donate)
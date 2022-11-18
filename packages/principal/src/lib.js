import * as ed25519 from './ed25519.js'
import * as RSA from './rsa.js'
import * as DNS from './dns.js'
import * as Key from './key.js'
import { create as createVerifier } from './verifier.js'
import { create as createSigner } from './signer.js'

export const Verifier = createVerifier([
  ed25519.Verifier,
  RSA.Verifier,
  DNS.Verifier,
])
export const Signer = createSigner([ed25519, RSA, DNS])

export { ed25519, RSA, Key, DNS }

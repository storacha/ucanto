import * as ed25519 from './ed25519.js'
import * as RSA from './rsa.js'
import * as DID from './did.js'
import * as Key from './key.js'

export const Verifier = DID
export const Signer = DID

export { ed25519, RSA, Key, DID }

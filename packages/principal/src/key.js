import * as ed25519 from './ed25519.js'
import * as RSA from './rsa.js'
import * as S from './signer.js'
import * as V from './verifier.js'

export const Verifier = ed25519.Verifier.or(RSA.Verifier)
export const Signer = ed25519.or(RSA)

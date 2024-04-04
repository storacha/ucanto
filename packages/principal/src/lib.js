import * as ed25519 from './ed25519.js'
import * as RSA from './rsa.js'
import * as Absentee from './absentee.js'
export * from './multiformat.js'
export const Verifier = ed25519.Verifier.or(RSA.Verifier)
export const Signer = ed25519.or(RSA)

// exports
export { ed25519, RSA, Absentee }

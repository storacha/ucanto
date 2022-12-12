import * as DID from '@ipld/dag-ucan/did'
import * as ED25519 from '@noble/ed25519'
import { varint } from 'multiformats'
import * as API from './type.js'
import * as Signature from '@ipld/dag-ucan/signature'
import { base58btc } from 'multiformats/bases/base58'
import * as Verifier from '../verifier.js'

/** @type {API.EdVerifier['code']} */
export const code = 0xed
export const name = 'Ed25519'

/** @type {API.SigAlg} */
export const signatureCode = Signature.EdDSA
export const signatureAlgorithm = 'EdDSA'
const PUBLIC_TAG_SIZE = varint.encodingLength(code)
const SIZE = 32 + PUBLIC_TAG_SIZE

/**
 * @typedef {API.EdVerifier} EdVerifier
 */

/**
 * Parses `did:key:` string as a VerifyingPrincipal.
 *
 * @param {API.DID|string} did
 * @returns {API.Verifier<API.DID, typeof signatureCode>}
 */
export const parse = did => decode(DID.parse(did))

/**
 * Takes ed25519 public key tagged with `0xed` multiformat code and creates a
 * corresponding `Principal` that can be used to verify signatures.
 *
 * @param {Uint8Array} bytes
 * @returns {API.EdVerifier}
 */
export const decode = bytes => {
  const [algorithm] = varint.decode(bytes)
  if (algorithm !== code) {
    throw new RangeError(
      `Unsupported key algorithm with multicode 0x${code.toString(16)}`
    )
  } else if (bytes.byteLength !== SIZE) {
    throw new RangeError(
      `Expected Uint8Array with byteLength ${SIZE}, instead got Uint8Array with byteLength ${bytes.byteLength}`
    )
  } else {
    return new Ed25519Verifier(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
}

/**
 * Formats given Principal into `did:key:` format.
 *
 * @param {API.Principal<API.DID>} principal
 */
export const format = principal => DID.format(principal)

/**
 * Encodes given Principal by tagging it's ed25519 public key with `0xed`
 * multiformat code.
 *
 * @param {API.Principal<API.DID<"key">>} principal
 */
export const encode = principal => DID.encode(principal)

/**
 * @implements {API.EdVerifier}
 */
class Ed25519Verifier extends Uint8Array {
  /** @type {typeof code} */
  get code() {
    return code
  }
  /** @type {typeof signatureCode} */
  get signatureCode() {
    return signatureCode
  }
  /** @type {typeof signatureAlgorithm} */
  get signatureAlgorithm() {
    return signatureAlgorithm
  }
  /**
   * Raw public key without a multiformat code.
   *
   * @readonly
   */
  get publicKey() {
    const key = new Uint8Array(this.buffer, this.byteOffset + PUBLIC_TAG_SIZE)
    Object.defineProperties(this, {
      publicKey: {
        value: key,
      },
    })
    return key
  }
  /**
   * DID of the Principal in `did:key` format.
   * @returns {API.DID<"key">}
   */
  did() {
    return `did:key:${base58btc.encode(this)}`
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Signature.EdDSA>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    return (
      signature.code === signatureCode &&
      ED25519.verify(signature.raw, payload, this.publicKey)
    )
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   * @returns {API.Verifier<ID, typeof signatureCode>}
   */
  withDID(id) {
    return Verifier.withDID(this, id)
  }

  toDIDKey() {
    return this.did()
  }
}

/**
 * @param {API.PrincipalParser} other
 */
export const or = other => Verifier.or({ parse }, other)

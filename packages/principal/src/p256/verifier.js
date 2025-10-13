import * as DID from '@ipld/dag-ucan/did'
import { p256 } from '@noble/curves/p256'
import { varint } from 'multiformats'
import * as API from './type.js'
import * as Signature from '@ipld/dag-ucan/signature'
import { base58btc } from 'multiformats/bases/base58'
import * as Verifier from '../verifier.js'

/** @type {API.P256Verifier['code']} */
export const code = 0x1200
export const name = 'P256'

/** @type {API.SigAlg} */
export const signatureCode = Signature.ES256
export const signatureAlgorithm = 'ES256'
const PUBLIC_TAG_SIZE = varint.encodingLength(code)
const SIZE = 33 + PUBLIC_TAG_SIZE // 33 bytes for compressed P-256 public key

/**
 * Parses `did:key:` string as a VerifyingPrincipal.
 *
 * @param {API.DID|string} did
 * @returns {API.Verifier<API.DID, typeof signatureCode>}
 */
export const parse = did => decode(DID.parse(did))

/**
 * Takes P-256 public key tagged with `0x1206` multiformat code and creates a
 * corresponding `Principal` that can be used to verify signatures.
 *
 * @param {Uint8Array} bytes
 * @returns {API.P256Verifier}
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
    return new P256Verifier(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
}

/**
 * Formats given Principal into `did:key:` format.
 *
 * @param {API.Principal<API.DID>} principal
 */
export const format = principal => DID.format(principal)

/**
 * Encodes given Principal by tagging it's P-256 public key with `0x1206`
 * multiformat code.
 *
 * @param {API.Principal<API.DID<"key">>} principal
 */
export const encode = principal => DID.encode(principal)

/**
 * @implements {API.P256Verifier}
 */
class P256Verifier extends Uint8Array {
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
   * @param {API.Signature<T, Signature.ES256>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    try {
      return (
        signature.code === signatureCode &&
        p256.verify(signature.raw, payload, this.publicKey)
      )
    } catch (error) {
      return false
    }
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
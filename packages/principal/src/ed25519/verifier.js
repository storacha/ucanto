import * as DID from '@ipld/dag-ucan/did'
import * as ED25519 from '@noble/ed25519'
import { varint } from 'multiformats'
import * as API from '@ucanto/interface'
import * as Signature from '@ipld/dag-ucan/signature'
import { base58btc } from 'multiformats/bases/base58'
export const code = 0xed

export const signatureCode = Signature.EdDSA
export const name = 'Ed25519'
const PUBLIC_TAG_SIZE = varint.encodingLength(code)
const SIZE = 32 + PUBLIC_TAG_SIZE

/**
 * @typedef {API.Verifier<"key", Signature.EdDSA> & Uint8Array} Verifier
 */

/**
 * Parses `did:key:` string as a VerifyingPrincipal.
 *
 * @param {API.DID<"key">|string} did
 */
export const parse = did => decode(DID.parse(did))

/**
 * Takes ed25519 public key tagged with `0xed` multiformat code and creates a
 * corresponding `Principal` that can be used to verify signatures.
 *
 * @param {Uint8Array} bytes
 * @returns {Verifier}
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
    return new Ed25519Principal(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength
    )
  }
}

/**
 * Formats given Principal into `did:key:` format.
 *
 * @param {API.Principal<"key">} principal
 */
export const format = principal => DID.format(principal)

/**
 * Encodes given Principal by tagging it's ed25519 public key with `0xed`
 * multiformat code.
 *
 * @param {API.Principal<"key">} principal
 */
export const encode = principal => DID.encode(principal)

/**
 * @implements {API.Verifier<"key", typeof Signature.EdDSA>}
 * @implements {API.Principal<"key">}
 */
class Ed25519Principal extends Uint8Array {
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
}

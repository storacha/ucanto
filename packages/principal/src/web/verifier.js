import { webcrypto } from 'one-webcrypto'
import { varint } from 'multiformats'
import { base58btc } from 'multiformats/bases/base58'
import * as API from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'

// export const RSA = 0x1205
// export const P256 = 0x1200
// export const P384 = 0x1201
// export const P512 = 0x1202

/**
 * @typedef {AlgorithmIdentifier | RsaPssParams | EcdsaParams} SignParams
 * @typedef {AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm} ImportParams
 */

/**
 * @template {number} Code
 * @template {number} SigCode
 * @template {string} Alg
 * @typedef {object} Config
 * @property {Code} verifierCode
 * @property {SigCode} signatureCode
 * @property {Alg} signatureAlgorithm
 * @property {SignParams} signParams
 * @property {ImportParams} importParams
 */

/**
 * @template {number} SigCode
 * @template {number} Code
 * @implements {API.Verifier<'key', SigCode>}
 */

class Verifier {
  /**
   * @param {object} options
   * @param {Uint8Array} options.bytes
   * @param {AlgorithmIdentifier | RsaPssParams | EcdsaParams} options.signParams
   * @param {AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm} options.importParams
   * @param {Code} options.code
   * @param {SigCode} options.signatureCode
   * @param {string} options.signatureAlgorithm
   * @param {CryptoKey} [options.publicKey]
   */
  constructor({
    bytes,
    publicKey,
    code,
    signParams,
    importParams,
    signatureAlgorithm,
    signatureCode,
  }) {
    /** @readonly */
    this.bytes = bytes
    /** @private */
    this.signParams = signParams
    /** @private */
    this.importParams = importParams
    /** @private */
    this.publicKey = publicKey
    /** @readonly */
    this.code = code
    /** @readonly */
    this.signatureAlgorithm = signatureAlgorithm
    /** @readonly */
    this.signatureCode = signatureCode
  }

  /**
   * DID of the Principal in `did:key` format.
   * @returns {API.DID<"key">}
   */
  did() {
    return `did:key:${base58btc.encode(this.bytes)}`
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof this.signatureCode>} signature
   * @returns {Promise<boolean>}
   */
  async verify(payload, signature) {
    return (
      signature.code === this.signatureCode &&
      webcrypto.subtle.verify(
        this.signParams,
        this.publicKey || (await this.loadPublicKey()),
        signature.raw,
        payload
      )
    )
  }

  /** @private */
  async loadPublicKey() {
    const publicKey = await webcrypto.subtle.importKey(
      'raw',
      this.bytes,
      this.importParams,
      true,
      ['verify']
    )

    Object.defineProperties(this, {
      publicKey: { value: publicKey },
    })

    return publicKey
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
 * @template {number} Code
 * @template {number} SigCode
 * @template {string} Alg
 * @param {Config<Code, SigCode, Alg>} options
 * @param {Uint8Array} bytes
 * @returns {API.Verifier<'key', SigCode>}
 */
export const decodeAs = (
  { verifierCode, signatureCode, signatureAlgorithm, signParams, importParams },
  bytes
) => {
  const [algorithm] = varint.decode(bytes)
  if (algorithm !== verifierCode) {
    throw new RangeError(
      `Unsupported key algorithm with multicode 0x${code.toString(16)}`
    )
  } else {
    return new Verifier({
      bytes,
      code: verifierCode,
      signatureCode,
      signatureAlgorithm,
      signParams,
      importParams,
    })
  }
}

/**
 * @template {number} Code
 * @template {number} SigCode
 * @template {string} Alg
 * @param {Config<Code, SigCode, Alg>} options
 * @param {API.DID<"key">|string} did
 */
export const parseAs = (options, did) => decodeAs(options, DID.parse(did))

/**
 * @template {number} Code
 * @template {number} SigCode
 * @template {string} Alg
 * @param {Config<Code, SigCode, Alg>} options
 */
export const configure = options => ({
  code: options.verifierCode,
  signatureCode: options.signatureCode,
  signatureAlgorithm: options.signatureAlgorithm,
  encode,
  format,
  decode: decodeAs.bind(null, options),
  parse: parseAs.bind(null, options),
})

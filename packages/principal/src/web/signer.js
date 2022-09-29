import * as API from '@ucanto/interface'
import { base58btc } from 'multiformats/bases/base58'
import { webcrypto } from 'one-webcrypto'
import { varint } from 'multiformats'
import * as DID from '@ipld/dag-ucan/did'
import * as Signature from '@ipld/dag-ucan/signature'
import * as Verifier from './verifier.js'

/**
 * @typedef {AlgorithmIdentifier | RsaPssParams | EcdsaParams} SignParams
 * @typedef {AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm} ImportParams
 * @typedef {RsaHashedKeyGenParams | EcKeyGenParams} GenParams
 */

/**
 * @template {number} KeyCode
 * @template {number} SigCode
 * @template {string} SigAlgName
 * @implements {API.NonExportableSigner<'key', SigCode>}
 */
class NonExportableSigner {
  /**
   * @param {object} options
   * @param {CryptoKey} options.privateKey
   * @param {KeyCode} options.code
   * @param {SigCode} options.signatureCode
   * @param {SigAlgName} options.signatureAlgorithm
   * @param {API.Verifier<'key', SigCode>} options.verifier
   * @param {AlgorithmIdentifier | RsaPssParams | EcdsaParams} options.signParams
   */
  constructor({
    privateKey,
    verifier,
    code,
    signatureCode,
    signatureAlgorithm,
    signParams,
  }) {
    /** @protected */
    this.privateKey = privateKey
    this.verifier = verifier
    this.code = code
    this.signatureCode = signatureCode
    this.signatureAlgorithm = signatureAlgorithm
    this.signParams = signParams
  }
  /**
   * @returns {API.DID<"key">}
   */
  did() {
    return this.verifier.did()
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof this.signatureCode>>}
   */
  async sign(payload) {
    const buffer = await webcrypto.subtle.sign(
      this.signParams,
      this.privateKey,
      payload.buffer
    )

    return Signature.create(this.signatureCode, new Uint8Array(buffer))
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof this.signatureCode>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  toCryptoKey() {
    return this.privateKey
  }
}

/**
 * @template {number} KeyCode
 * @template {number} SigCode
 * @template {string} SigAlgName
 * @extends {NonExportableSigner<KeyCode, SigCode, SigAlgName>}
 */
class ExportableSigner extends NonExportableSigner {
  async export() {
    const { privateKey, verifier } = this

    const privateBytes = Verifier.encode(verifier)
    const buffer = await webcrypto.subtle.exportKey('raw', privateKey)
    const offset = varint.encodingLength(this.code)
    const size = offset + buffer.byteLength + privateBytes.byteLength

    const bytes = new Uint8Array(size)
    varint.encodeTo(this.code, bytes, 0)
    bytes.set(new Uint8Array(buffer), offset)
    bytes.set(privateBytes, offset + buffer.byteLength)

    return bytes
  }
}

/**
 * @template {number} Code
 * @template {number} VerifierCode
 * @template {number} SigCode
 * @template {string} Alg
 * @typedef {object} Config
 * @property {Code} signerCode
 * @property {VerifierCode} verifierCode
 * @property {SigCode} signatureCode
 * @property {Alg} signatureAlgorithm
 * @property {SignParams} signParams
 * @property {ImportParams} importParams
 * @property {GenParams} genParams
 */

/**
 * @template {number} Code
 * @template {number} VerifierCode
 * @template {number} SigCode
 * @template {string} Alg
 * @param {Config<Code, VerifierCode, SigCode, Alg>} options
 */
export const configure = options => ({
  code: options.signerCode,
  signatureCode: options.signatureCode,
  signatureAlgorithm: options.signatureAlgorithm,
  Verifier: Verifier.configure(options),
  importKeyPair: importAs.bind(null, options),
})

/**
 *
 * @param {object} options
 * @param {ImportParams} options.importParams
 * @param {SignParams} options.signParams
 * @param {boolean} [options.extractable]
 * @param {number} options.verifierCode
 * @param {number} options.signatureCode
 * @param {string} options.signatureAlgorithm
 * @param {Uint8Array} bytes
 */
export const importAs = async (
  {
    importParams,
    verifierCode,
    signatureCode,
    signatureAlgorithm,
    signParams,
    extractable = true,
  },
  bytes
) => {
  const keypair = await webcrypto.subtle.importKey(
    'raw',
    bytes,
    importParams,
    extractable,
    ['sign', 'verify']
  )

  const publicBytes = await importKey(verifierCode, keypair.publicKey)
  const verifier = Verifier.decodeAs(
    {
      verifierCode,
      signatureCode,
      signatureAlgorithm,
      signParams,
      importParams,
    },
    publicBytes
  )

  const 
}
/**
 * @template {number} Code
 * @template {number} PubCode
 * @template {number} SigCode
 * @template {string} Alg
 * @param {object} options
 * @param {GenParams} options.genParams
 * @param {boolean} options.extractable
 * @param {Code} options.signerCode
 * @param {PubCode} options.verifierCode
 * @param {SignParams} options.signParams
 * @param {ImportParams} options.importParams
 * @param {SigCode} options.signatureCode
 * @param {Alg} options.signatureAlgorithm
 */
export const generate = async ({
  genParams,
  extractable = false,
  signatureCode,
  signatureAlgorithm,
  signerCode,
  verifierCode,
  signParams,
  importParams,
}) => {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    genParams,
    extractable,
    ['sign', 'verify']
  )
  const publicBytes = await importKey(verifierCode, publicKey)
  const verifier = Verifier.decodeAs(
    {
      verifierCode,
      signatureCode,
      signatureAlgorithm,
      signParams,
      importParams,
    },
    publicBytes
  )

  if (privateKey.extractable) {
    return new ExportableSigner({
      privateKey,
      verifier,
      code: signerCode,
      signatureCode,
      signatureAlgorithm,
      signParams,
    })
  } else {
    return new NonExportableSigner({
      privateKey,
      verifier,
      code: signerCode,
      signatureCode,
      signatureAlgorithm,
      signParams,
    })
  }
}

/**
 * @template {number} Code
 * @param {Code} code
 * @param {CryptoKey} key
 */

const importKey = async (code, key) => {
  const buffer = await webcrypto.subtle.exportKey('raw', key)
  const offset = varint.encodingLength(code)
  const bytes = new Uint8Array(buffer.byteLength + offset)
  varint.encodeTo(code, bytes, 0)
  bytes.set(new Uint8Array(buffer), offset)
  return bytes
}

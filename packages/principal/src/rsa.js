import { webcrypto } from 'one-webcrypto'
import { base58btc } from 'multiformats/bases/base58'
import * as API from './rsa/type.js'
import * as DID from '@ipld/dag-ucan/did'
import { tagWith, untagWith } from './multiformat.js'
import * as Signature from '@ipld/dag-ucan/signature'
import * as SPKI from './rsa/spki.js'
import * as PKCS8 from './rsa/pkcs8.js'
import * as PrivateKey from './rsa/private-key.js'
import * as PublicKey from './rsa/public-key.js'

export const name = 'RSA'
export const code = 0x1305
const verifierCode = 0x1205

export const signatureCode = Signature.RS256
export const signatureAlgorithm = 'RS256'

const ALG = 'RSASSA-PKCS1-v1_5'
const HASH_ALG = 'SHA-256'
const KEY_SIZE = 2048
const SALT_LEGNTH = 128
const IMPORT_PARAMS = {
  name: ALG,
  hash: { name: HASH_ALG },
}

/**
 * @param {object} options
 * @param {number} [options.size]
 * @param {boolean} [options.extractable]
 * @returns {Promise<API.RSASigner>}
 */
export const generate = async ({
  size = KEY_SIZE,
  extractable = false,
} = {}) => {
  const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
    {
      name: ALG,
      modulusLength: size,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: HASH_ALG },
    },

    extractable,
    ['sign', 'verify']
  )

  const publicBuffer = await webcrypto.subtle.exportKey('spki', publicKey)
  const publicBytes = tagWith(
    verifierCode,
    SPKI.decode(new Uint8Array(publicBuffer))
  )

  const verifier = new RSAVerifier({
    bytes: publicBytes,
    key: publicKey,
  })

  return new RSASigner({ verifier, key: privateKey })
}

/**
 * @param {API.ByteView<API.Signer<'key', typeof signatureCode>>} bytes
 * @returns {API.RSASigner}
 */
export const decode = bytes => {
  const key = PrivateKey.decode(untagWith(code, bytes))
  const verifier = new RSAVerifier({
    bytes: tagWith(verifierCode, PublicKey.encode(key)),
  })
  return new ImportedRSASigner({ bytes, verifier })
}

/**
 * @template T
 * @param {API.RSASigner} signer
 * @param {API.ByteView<T>} payload
 * @returns {Promise<API.Signature<T, typeof signatureCode>>}
 */
export const sign = async (signer, payload) => {
  const buffer = await webcrypto.subtle.sign(
    { name: ALG, saltLength: SALT_LEGNTH },
    signer.key || (await signer.toCryptoKey()),
    payload
  )

  return Signature.create(signatureCode, new Uint8Array(buffer))
}

/**
 * @template T
 * @param {API.RSAVerifier} verifier
 * @param {API.ByteView<T>} payload
 * @param {API.Signature<T, typeof signatureCode>} signature
 * @returns {Promise<boolean>}
 */
export const verify = async (verifier, payload, signature) => {
  if (signature.code !== signatureCode) {
    return false
  }

  return webcrypto.subtle.verify(
    { name: ALG, hash: { name: HASH_ALG } },
    verifier.key || (await verifier.toCryptoKey()),
    signature.raw,
    payload
  )
}

class RSAPrincipal {
  /**
   * @param {object} options
   * @param {API.RSAVerifier} options.verifier
   */
  constructor({ verifier }) {
    this.verifier = verifier
  }
  get signer() {
    return this
  }
  /**
   * @type {typeof code}
   */
  get code() {
    return code
  }
  /**
   * @type {typeof signatureCode}
   */
  get signatureCode() {
    return signatureCode
  }
  /**
   * @type {typeof signatureAlgorithm}
   */
  get signatureAlgorithm() {
    return signatureAlgorithm
  }

  did() {
    return this.verifier.did()
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof this.signatureCode>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }
}

/**
 * @implements {API.RSASigner}
 */
class RSASigner extends RSAPrincipal {
  /**
   * @param {object} options
   * @param {CryptoKey} options.key
   * @param {API.ByteView<API.Signer<"key", typeof signatureCode>>|null} [options.bytes]
   * @param {API.RSAVerifier} options.verifier
   */
  constructor({ bytes = null, key, verifier }) {
    super({ verifier })
    this.key = key
    this.bytes = bytes

    // If non extractable we unset the export field
    if (!key.extractable) {
      const signer = /** @type {API.RSASigner} */ (this)
      signer.export = undefined
    }
  }
  async export() {
    const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', this.key)
    return tagWith(code, PKCS8.decode(new Uint8Array(pkcs8)))
  }
  toCryptoKey() {
    return this.key
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof signatureCode>>}
   */
  sign(payload) {
    return sign(this, payload)
  }
}

/**
 * @implements {API.RSASigner}
 */
class ImportedRSASigner extends RSAPrincipal {
  /**
   * @param {object} options
   * @param {CryptoKey|null} [options.key]
   * @param {API.ByteView<API.Signer<"key", typeof signatureCode>>} options.bytes
   * @param {API.RSAVerifier} options.verifier
   */
  constructor({ bytes, key = null, verifier }) {
    super({ verifier })
    this.key = key
    this.bytes = bytes
  }
  export() {
    return this.bytes
  }
  async import() {
    const key = await webcrypto.subtle.importKey(
      'pkcs8',
      PKCS8.encode(untagWith(code, this.bytes)),
      IMPORT_PARAMS,
      true,
      ['sign']
    )
    this.key = key

    return key
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof this.signatureCode>>}
   */
  sign(payload) {
    return sign(this, payload)
  }

  toCryptoKey() {
    return this.key || this.import()
  }
}

/**
 * @implements {API.RSAVerifier}
 */
class RSAVerifier {
  /**
   * @param {object} options
   * @param {CryptoKey|null} [options.key]
   * @param {API.ByteView<API.RSAVerifier>} options.bytes
   */
  constructor({ bytes, key = null }) {
    this.key = key
    this.bytes = bytes
  }
  /** @type {typeof verifierCode} */
  get code() {
    return verifierCode
  }
  /**
   * @type {typeof signatureCode}
   */
  get signatureCode() {
    return signatureCode
  }
  /**
   * @type {typeof signatureAlgorithm}
   */
  get signatureAlgorithm() {
    return signatureAlgorithm
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
    return verify(this, payload, signature)
  }

  async import() {
    const key = await webcrypto.subtle.importKey(
      'spki',
      SPKI.encode(untagWith(verifierCode, this.bytes)),
      IMPORT_PARAMS,
      true,
      ['verify']
    )
    this.key = key
    return key
  }

  toCryptoKey() {
    return this.key || this.import()
  }

  export() {
    return this.bytes
  }
}

export const Verifier = {
  /**
   * @param {API.DID} did
   * @returns {API.RSAVerifier}
   */
  parse: did => Verifier.decode(/** @type {Uint8Array} */ (DID.parse(did))),

  /**
   * @param {API.ByteView<API.RSAVerifier>} bytes
   * @returns {API.RSAVerifier}
   */
  decode: bytes => {
    untagWith(verifierCode, bytes)
    return new RSAVerifier({ bytes })
  },
}

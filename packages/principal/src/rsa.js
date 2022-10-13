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
export * from './rsa/type.js'

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
  // We start by generate an RSA keypair using web crypto API.
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    {
      name: ALG,
      modulusLength: size,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: HASH_ALG },
    },

    extractable,
    ['sign', 'verify']
  )

  // Next we need to encode public key, because `RSAVerifier` uses it to
  // for implementing a `did()` method. To do this we first export
  // Subject Public Key Info (SPKI) using web crypto API.
  const spki = await webcrypto.subtle.exportKey('spki', publicKey)
  // Then we extract public key from the SPKI and tag it with RSA public key
  // multicode
  const publicBytes = tagWith(verifierCode, SPKI.decode(new Uint8Array(spki)))
  // Now that we have publicKey and it's multiformat representation we can
  // create a verifier.
  const verifier = new RSAVerifier({ bytes: publicBytes, publicKey })

  // If we generated non extractable key we just wrap actual keys and verifier
  // in the RSASigner view.
  if (!extractable) {
    return new UnextractableRSASigner({
      privateKey,
      verifier,
    })
  }
  // Otherwise we export key in Private Key Cryptography Standards (PKCS)
  // format and extract a bytes corresponding to the private key, which
  // we tag with RSA private key multiformat code. With both binary and actual
  // key representation we create a RSASigner view.
  // Please note that do key export flow during generation so that we can:
  // 1. Guarantee that it will be exportable.
  // 2. Make `export` method sync.
  else {
    const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', privateKey)
    const bytes = tagWith(code, PKCS8.decode(new Uint8Array(pkcs8)))
    return new ExtractableRSASigner({
      privateKey,
      bytes,
      verifier,
    })
  }
}

/**
 * @param {API.SignerArchive<API.Signer<'key', typeof signatureCode>>} archive
 * @returns {API.RSASigner}
 */
export const from = archive => {
  if (archive instanceof Uint8Array) {
    return decode(archive)
  } else {
    return new UnextractableRSASigner({
      privateKey: archive.key,
      verifier: RSAVerifier.parse(archive.did),
    })
  }
}

/**
 * @param {EncodedSigner} bytes
 * @returns {API.RSASigner}
 */
export const decode = bytes => {
  // First we decode RSA key data from the private key with multicode tag.
  const rsa = PrivateKey.decode(untagWith(code, bytes))
  // Then we encode RSA key data as public key with multicode tag.
  const publicBytes = tagWith(verifierCode, PublicKey.encode(rsa))

  return new ExtractableRSASigner({
    bytes,
    privateKey: webcrypto.subtle.importKey(
      'pkcs8',
      PKCS8.encode(untagWith(code, bytes)),
      IMPORT_PARAMS,
      true,
      ['sign']
    ),

    verifier: RSAVerifier.decode(publicBytes),
  })
}

/**
 * @implements {API.RSAVerifier}
 */
class RSAVerifier {
  /**
   * @param {object} options
   * @param {API.Await<CryptoKey>} options.publicKey
   * @param {API.ByteView<API.RSAVerifier>} options.bytes
   */
  constructor({ publicKey, bytes }) {
    /** @private */
    this.publicKey = publicKey
    /** @private */
    this.bytes = bytes
  }

  /**
   * @param {API.ByteView<API.RSAVerifier>} bytes
   * @returns {API.RSAVerifier}
   */
  static decode(bytes) {
    return new this({
      bytes,
      publicKey: webcrypto.subtle.importKey(
        'spki',
        SPKI.encode(untagWith(verifierCode, bytes)),
        IMPORT_PARAMS,
        true,
        ['verify']
      ),
    })
  }
  /**
   * @param {API.DID} did
   * @returns {API.RSAVerifier}
   */
  static parse(did) {
    return RSAVerifier.decode(/** @type {Uint8Array} */ (DID.parse(did)))
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
    // if signature code does not match RS256 it's not signed by corresponding
    // signer.
    if (signature.code !== signatureCode) {
      return false
    }

    return webcrypto.subtle.verify(
      { name: ALG, hash: { name: HASH_ALG } },
      await this.publicKey,
      signature.raw,
      payload
    )
  }
}

/** @type {API.PrincipalParser} */
export const Verifier = RSAVerifier

/**
 * @typedef {API.ByteView<API.Signer<'key', typeof signatureCode>>} EncodedSigner
 */

class RSASigner {
  /**
   * @param {object} options
   * @param {API.Await<CryptoKey>} options.privateKey
   * @param {API.RSAVerifier} options.verifier
   */
  constructor({ privateKey, verifier }) {
    /** @readonly */
    this.verifier = verifier
    /** @protected */
    this.privateKey = privateKey
  }
  get signer() {
    // @ts-expect-error - we define export methods on subclasses
    return /** @type {API.RSASigner} */ (this)
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
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof signatureCode>>}
   */
  async sign(payload) {
    this.privateKey
    const buffer = await webcrypto.subtle.sign(
      { name: ALG, saltLength: SALT_LEGNTH },
      await this.privateKey,
      payload
    )

    return Signature.create(signatureCode, new Uint8Array(buffer))
  }
}

/**
 * @implements {API.RSASigner}
 */
class ExtractableRSASigner extends RSASigner {
  /**
   * @param {object} options
   * @param {API.Await<CryptoKey>} options.privateKey
   * @param {EncodedSigner} options.bytes
   * @param {API.RSAVerifier} options.verifier
   */
  constructor(options) {
    super(options)
    this.bytes = options.bytes
  }
  toArchive() {
    return this.bytes
  }
}

/**
 * @implements {API.RSASigner}
 */
class UnextractableRSASigner extends RSASigner {
  /**
   * @param {object} options
   * @param {CryptoKey} options.privateKey
   * @param {API.RSAVerifier} options.verifier
   */
  constructor(options) {
    super(options)
    this.privateKey = options.privateKey
  }
  toArchive() {
    return {
      did: this.did(),
      key: this.privateKey,
    }
  }
}

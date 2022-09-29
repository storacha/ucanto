import { webcrypto } from 'one-webcrypto'
import { bytes, varint } from 'multiformats'
import { base58btc } from 'multiformats/bases/base58'
import * as API from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'
import { tagWith, untagWith } from './util.js'
import * as Signature from '@ipld/dag-ucan/signature'
import * as SPKI from './rsa/spki.js'
import * as PKCS8 from './rsa/pkcs8.js'
import * as PrivateKey from './rsa/private-key.js'
import * as PublicKey from './rsa/public-key.js'

import { base64url } from 'multiformats/bases/base64'
import { encodeSequence, encodeInt, encodeBitString } from './rsa/asn1.js'

export const name = 'RSA'
export const code = 0x1305
const verifierCode = 0x1205

export const signatureCode = 0xd01205
export const signatureAlgorithm = 'RS256'

const ALG = 'RSASSA-PKCS1-v1_5'
const HASH_ALG = 'SHA-256'
const KEY_SIZE = 2048
const SALT_LEGNTH = 128

/**
 * @param {object} options
 * @param {number} [options.size]
 * @param {boolean} [options.extractable]
 * @returns {Promise<API.SigningPrincipal<"key", typeof signatureCode>>}
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

  const signer = privateKey.extractable
    ? new ExtractableRSASigner({
        verifier,
        key: privateKey,
      })
    : new RSASigner({
        verifier,
        key: privateKey,
      })

  return signer
}

class RSASigner {
  /**
   * @param {object} options
   * @param {CryptoKey|null} options.key
   * @param {API.ByteView<API.Signer<"key", typeof signatureCode>>|null} options.bytes
   * @param {API.Verifier<"key", typeof this.signatureCode> & { bytes: Uint8Array }} options.verifier
   */
  constructor({ key, bytes, verifier }) {
    this.key = key
    this.bytes = bytes
    this.verifier = verifier
  }
  get signer() {
    return this
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
   * @returns {Promise<API.Signature<T, typeof this.signatureCode>>}
   */
  async sign(payload) {
    const buffer = await webcrypto.subtle.sign(
      { name: ALG, saltLength: SALT_LEGNTH },
      this.key || (await this.import()),
      payload
    )

    return Signature.create(this.signatureCode, new Uint8Array(buffer))
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

  toCryptoKey() {
    return this.key || this.import()
  }
}

/**
 * @implements {API.SigningPrincipal<"key", typeof signatureCode>}
 */
class ImportedRSASigner extends RSASigner {
  /**
   * @param {object} options
   * @param {CryptoKey|null} options.key
   * @param {API.ByteView<API.Signer<"key", typeof signatureCode>>} options.bytes
   * @param {API.Verifier<"key", typeof signatureCode> & { bytes: Uint8Array }} options.verifier
   */
  constructor({ bytes, verifier }) {
    super({ key: null, bytes, verifier })
    this.bytes = bytes
  }
  export() {
    return this.bytes
  }
}

/**
 * @implements {API.Signer<"key", typeof signatureCode>}
 */
class ExtractableRSASigner extends RSASigner {
  // async export() {
  //   const buffer = await webcrypto.subtle.exportKey('pkcs8', this.key)
  //   const bytes = toRSAPrivateKey(new Uint8Array(buffer))
  //   return tagWith(code, bytes)
  // }
  async export() {
    return exportPrivateKey(this.key)
  }
}

/**
 * @implements {API.Verifier<"key", typeof signatureCode>}
 */
class RSAVerifier {
  /**
   * @param {object} options
   * @param {CryptoKey|null} options.key
   * @param {API.ByteView<API.Verifier<"key", typeof signatureCode>>} options.bytes
   */
  constructor({ bytes, key }) {
    this.key = key
    this.bytes = bytes
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
    if (signature.code !== this.signatureCode) {
      return false
    }

    return (
      signature.code === this.signatureCode &&
      webcrypto.subtle.verify(
        { name: ALG, hash: { name: HASH_ALG } },
        this.key || (await this.import()),
        signature.raw,
        payload
      )
    )
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

  export() {
    return this.bytes
  }
}

/**
 * @type {API.PrincipalParser}
 */
export const Verifier = {
  /**
   * @param {API.DID} did
   */
  parse: did => {
    return new RSAVerifier({
      bytes: /** @type {Uint8Array} */ (DID.parse(did)),
      key: null,
    })
  },
}

const IMPORT_PARAMS = {
  name: ALG,
  hash: { name: HASH_ALG },
}

/**
 * @param {API.ByteView<API.Signer<'key', typeof signatureCode>>} bytes
 */
export const decode = bytes => {
  const key = PrivateKey.decode(untagWith(code, bytes))

  return new RSASignerDecoder({
    bytes,
    verifier: new RSAVerifier({
      bytes: tagWith(verifierCode, PublicKey.encode(key)),
      key: null,
    }),
  })
}

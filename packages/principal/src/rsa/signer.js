import { webcrypto } from 'one-webcrypto'
import * as Signature from '@ipld/dag-ucan/signature'
import * as API from '@ucanto/interface'
import { varint } from 'multiformats'
import * as Verifier from './verifier.js'

export const code = 0x1305

export const {
  RSA_ALG,
  SALT_LEGNTH,
  PUBLIC_TAG_SIZE,
  signatureCode,
  signatureAlgorithm,
  name,
} = Verifier

export const DEFAULT_HASH_ALG = 'SHA-256'
export const publicKeyCode = 0x1205
export const DEFAULT_KEY_SIZE = 2048
export const PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01])
export const PRIVATE_TAG_SIZE = varint.encodingLength(code)

/**
 * Generates new RSA keypair.
 * @param {object} options
 * @param {number} [options.size]
 * @param {boolean} [options.extractable]
 * @returns {Promise<API.Signer<'key', typeof signatureCode>>}
 */
export const generate = async ({ size = 2048, extractable = false } = {}) => {
  const keypair = await webcrypto.subtle.generateKey(
    {
      name: RSA_ALG,
      modulusLength: size,
      publicExponent: PUBLIC_EXPONENT,
      hash: { name: DEFAULT_HASH_ALG },
    },
    extractable,
    ['sign', 'verify']
  )

  const bytes = new Uint8Array(
    await webcrypto.subtle.exportKey('raw', keypair.publicKey)
  )
  const verifier = Verifier.decode(bytes)
  Object.defineProperties(verifier, {
    publicKey: { value: keypair.publicKey },
  })

  return extractable
    ? new ExportableRSASigner(keypair, verifier)
    : new RSASigner(keypair, verifier)
}

/**
 * @implements {API.NonExportableSigner<'key', typeof signatureCode>}
 */

class RSASigner {
  /**
   * @param {CryptoKeyPair} keypair
   * @param {API.Verifier<'key', typeof signatureCode>} verifier
   */
  constructor(keypair, verifier) {
    /** @protected */
    this.keypair = keypair
    /** @private */
    this.verifier = verifier
  }
  /**
   * @returns {API.DID<"key">}
   */
  did() {
    return this.verifier.did()
  }
  get signatureCode() {
    return signatureCode
  }
  /**
   * @type {'RS256'}
   */
  get signatureAlgorithm() {
    return signatureAlgorithm
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof signatureCode>>}
   */
  async sign(payload) {
    const buffer = await webcrypto.subtle.sign(
      { name: RSA_ALG, saltLength: SALT_LEGNTH },
      this.keypair.publicKey,
      payload.buffer
    )

    return Signature.create(this.signatureCode, new Uint8Array(buffer))
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof signatureCode>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  toCryptoKeyPair() {
    return this.keypair
  }
}

class ExportableRSASigner extends RSASigner {
  async export() {
    const { keypair } = this
    const [privateKey, publicKey] = await Promise.all([
      webcrypto.subtle.exportKey('raw', keypair.privateKey),
      webcrypto.subtle.exportKey('raw', keypair.publicKey),
    ])

    const bytes = new Uint8Array(
      PRIVATE_TAG_SIZE +
        privateKey.byteLength +
        PUBLIC_TAG_SIZE +
        publicKey.byteLength
    )

    varint.encodeTo(code, bytes, 0)
    bytes.set(new Uint8Array(privateKey), PRIVATE_TAG_SIZE)
    varint.encodeTo(
      publicKeyCode,
      bytes,
      PRIVATE_TAG_SIZE + privateKey.byteLength
    )
    bytes.set(
      new Uint8Array(privateKey),
      PRIVATE_TAG_SIZE + privateKey.byteLength + PUBLIC_TAG_SIZE
    )

    return bytes
  }
}

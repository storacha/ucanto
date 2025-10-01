import { p256 } from '@noble/curves/p256'
import { varint } from 'multiformats'
import * as API from './type.js'
import * as Verifier from './verifier.js'
import { base64pad } from 'multiformats/bases/base64'
import * as Signature from '@ipld/dag-ucan/signature'
import * as Signer from '../signer.js'
export * from './type.js'

export const code = 0x1301
export const name = Verifier.name

/** @type {'ES256'} */
export const signatureAlgorithm = Verifier.signatureAlgorithm
export const signatureCode = Verifier.signatureCode

const PRIVATE_TAG_SIZE = varint.encodingLength(code)
const PUBLIC_TAG_SIZE = varint.encodingLength(Verifier.code)
const PRIVATE_KEY_SIZE = 32 // P-256 private key size
const PUBLIC_KEY_SIZE = 33 // P-256 compressed public key size
const SIZE = PRIVATE_TAG_SIZE + PRIVATE_KEY_SIZE + PUBLIC_TAG_SIZE + PUBLIC_KEY_SIZE

export const PUB_KEY_OFFSET = PRIVATE_TAG_SIZE + PRIVATE_KEY_SIZE

/**
 * Generates new issuer by generating underlying P-256 keypair.
 * @returns {Promise<API.P256Signer>}
 */
export const generate = () => derive(p256.utils.randomPrivateKey())

/**
 * Derives issuer from 32 byte long secret key.
 * @param {Uint8Array} secret
 * @returns {Promise<API.P256Signer>}
 */
export const derive = async secret => {
  if (secret.byteLength !== PRIVATE_KEY_SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${PRIVATE_KEY_SIZE} instead not ${secret.byteLength}`
    )
  }

  const publicKey = p256.getPublicKey(secret, true) // true for compressed
  const signer = new P256Signer(SIZE)

  varint.encodeTo(code, signer, 0)
  signer.set(secret, PRIVATE_TAG_SIZE)

  varint.encodeTo(Verifier.code, signer, PRIVATE_TAG_SIZE + PRIVATE_KEY_SIZE)
  signer.set(publicKey, PRIVATE_TAG_SIZE + PRIVATE_KEY_SIZE + PUBLIC_TAG_SIZE)

  return signer
}

/**
 * @param {API.SignerArchive<API.DID, typeof signatureCode>} archive
 * @returns {API.P256Signer}
 */
export const from = ({ id, keys }) => {
  if (id.startsWith('did:key:')) {
    const key = keys[/** @type {API.DIDKey} */ (id)]
    if (key instanceof Uint8Array) {
      return decode(key)
    }
  }
  throw new TypeError(`Unsupported archive format`)
}

/**
 * @template {API.SignerImporter} O
 * @param {O} other
 */
export const or = other => Signer.or({ from }, other)

/**
 * @param {Uint8Array} bytes
 * @returns {API.P256Signer}
 */
export const decode = bytes => {
  if (bytes.byteLength !== SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${SIZE} instead not ${bytes.byteLength}`
    )
  }

  {
    const [keyCode] = varint.decode(bytes)
    if (keyCode !== code) {
      throw new Error(`Given bytes must be a multiformat with ${code} tag`)
    }
  }

  {
    const [code] = varint.decode(bytes.subarray(PUB_KEY_OFFSET))
    if (code !== Verifier.code) {
      throw new Error(
        `Given bytes must contain public key in multiformats with ${Verifier.code} tag`
      )
    }
  }

  return new P256Signer(bytes)
}

/**
 * @param {API.P256Signer} signer
 * @return {API.ByteView<API.P256Signer & CryptoKeyPair>}
 */
export const encode = signer => signer.encode()

/**
 * @template {string} Prefix
 * @param {API.P256Signer} signer
 * @param {API.MultibaseEncoder<Prefix>} [encoder]
 */
export const format = (signer, encoder) =>
  (encoder || base64pad).encode(encode(signer))

/**
 * @template {string} Prefix
 * @param {string} principal
 * @param {API.MultibaseDecoder<Prefix>} [decoder]
 * @returns {API.P256Signer}
 */
export const parse = (principal, decoder) =>
  decode((decoder || base64pad).decode(principal))

/**
 * @implements {API.P256Signer}
 */
class P256Signer extends Uint8Array {
  /** @type {typeof code} */
  get code() {
    return code
  }
  get signer() {
    return this
  }
  /** @type {API.P256Verifier} */
  get verifier() {
    const bytes = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE + PRIVATE_KEY_SIZE)
    const verifier = Verifier.decode(bytes)

    Object.defineProperties(this, {
      verifier: {
        value: verifier,
      },
    })

    return verifier
  }

  /**
   * Raw private key without multiformat code.
   */
  get secret() {
    const secret = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE, PRIVATE_KEY_SIZE)
    Object.defineProperties(this, {
      secret: {
        value: secret,
      },
    })

    return secret
  }

  /**
   * DID of this principal in `did:key` format.
   */
  did() {
    return this.verifier.did()
  }

  toDIDKey() {
    return this.verifier.toDIDKey()
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   * @returns {API.Signer<ID, typeof Signature.ES256>}
   */
  withDID(id) {
    return Signer.withDID(this, id)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.SignatureView<T, typeof Signature.ES256>>}
   */
  async sign(payload) {
    const raw = p256.sign(payload, this.secret).toCompactRawBytes()
    return Signature.create(this.signatureCode, raw)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof this.signatureCode>} signature
   * @returns {API.Await<boolean>}
   */
  async verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  /**
   * Encodes keypair into bytes.
   */
  encode() {
    return new Uint8Array(this)
  }

  /**
   * @returns {API.SignerArchive<API.DIDKey, typeof signatureCode>}
   */
  toArchive() {
    return {
      id: this.did(),
      keys: { [this.did()]: this.encode() }
    }
  }

  get signatureCode() {
    return signatureCode
  }

  get signatureAlgorithm() {
    return signatureAlgorithm
  }
}
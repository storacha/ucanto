import { webcrypto } from 'one-webcrypto'
import { varint } from 'multiformats'
import * as API from './type.js'
import * as Verifier from './verifier.js'
import { base64pad, base64url } from 'multiformats/bases/base64'
import * as Signature from '@ipld/dag-ucan/signature'
import * as Signer from '../signer.js'
export * from './type.js'

export const code = 0x1300
export const name = Verifier.name

/** @type {'EdDSA'} */
export const signatureAlgorithm = Verifier.signatureAlgorithm
export const signatureCode = Verifier.signatureCode

const PRIVATE_TAG_SIZE = varint.encodingLength(code)
const PUBLIC_TAG_SIZE = varint.encodingLength(Verifier.code)
const KEY_SIZE = 32
const SIZE = PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE + KEY_SIZE
const ALG = { name: 'Ed25519' }
const PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04,
  0x22, 0x04, 0x20,
])

export const PUB_KEY_OFFSET = PRIVATE_TAG_SIZE + KEY_SIZE

/**
 * Generates new issuer by generating underlying ED25519 keypair.
 * @param {{extractable?: boolean}} [options]
 * @returns {Promise<API.EdSigner>}
 */
export const generate = async ({ extractable = false } = {}) => {
  const keypair = /** @type {CryptoKeyPair} */ (
    await webcrypto.subtle.generateKey(ALG, extractable, ['sign', 'verify'])
  )

  if (extractable) {
    const pkcs8 = new Uint8Array(
      await webcrypto.subtle.exportKey('pkcs8', keypair.privateKey)
    )
    const secret = decodePKCS8(pkcs8)
    const publicKey = new Uint8Array(
      await webcrypto.subtle.exportKey('raw', keypair.publicKey)
    )
    return createSigner({ secret, publicKey })
  }

  const raw = new Uint8Array(
    await webcrypto.subtle.exportKey('raw', keypair.publicKey)
  )
  const bytes = new Uint8Array(PUBLIC_TAG_SIZE + KEY_SIZE)
  varint.encodeTo(Verifier.code, bytes, 0)
  bytes.set(raw, PUBLIC_TAG_SIZE)

  return new UnextractableEd25519Signer({
    privateKey: keypair.privateKey,
    verifier: Verifier.decode(bytes),
  })
}

/**
 * Derives issuer from 32 byte long secret key.
 * @param {Uint8Array} secret
 * @returns {Promise<API.EdSigner>}
 */
export const derive = async secret => {
  if (secret.byteLength !== KEY_SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${KEY_SIZE} instead not ${secret.byteLength}`
    )
  }

  const privateKey = await webcrypto.subtle.importKey(
    'pkcs8',
    encodePKCS8(secret),
    ALG,
    true,
    ['sign']
  )
  const jwk = await webcrypto.subtle.exportKey('jwk', privateKey)
  const publicKey = decodePublicKey(jwk)
  return createSigner({ secret, publicKey })
}

/**
 * @param {API.SignerArchive<API.DID, typeof signatureCode>} archive
 * @returns {API.EdSigner}
 */
export const from = ({ id, keys }) => {
  if (id.startsWith('did:key:')) {
    const did = /** @type {API.DIDKey} */ (id)
    const key = keys[did]
    if (key instanceof Uint8Array) {
      return decode(key)
    } else if (
      key &&
      key.type === 'private' &&
      key.algorithm &&
      key.algorithm.name === 'Ed25519'
    ) {
      return new UnextractableEd25519Signer({
        privateKey: key,
        verifier: /** @type {API.EdVerifier} */ (Verifier.parse(did)),
      })
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
 * @returns {API.EdSigner}
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

  return new Ed25519Signer(bytes)
}

/**
 * @param {API.EdSigner} signer
 * @return {API.ByteView<API.EdSigner & CryptoKeyPair>}
 */
export const encode = signer => signer.encode()

/**
 * @template {string} Prefix
 * @param {API.EdSigner} signer
 * @param {API.MultibaseEncoder<Prefix>} [encoder]
 */
export const format = (signer, encoder) =>
  (encoder || base64pad).encode(encode(signer))

/**
 * @template {string} Prefix
 * @param {string} principal
 * @param {API.MultibaseDecoder<Prefix>} [decoder]
 * @returns {API.EdSigner}
 */
export const parse = (principal, decoder) =>
  decode((decoder || base64pad).decode(principal))

/**
 * @implements {API.EdSigner}
 */
class Ed25519Signer extends Uint8Array {
  /** @type {typeof code} */
  get code() {
    return code
  }
  get signer() {
    return this
  }
  /** @type {API.EdVerifier} */
  get verifier() {
    const bytes = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE + KEY_SIZE)
    const verifier = Verifier.decode(bytes)

    Object.defineProperties(this, {
      verifier: {
        value: verifier,
      },
    })

    return verifier
  }

  /**
   * Raw public key without multiformat code.
   */
  get secret() {
    const secret = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE, KEY_SIZE)
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
   * @returns {API.Signer<ID, typeof Signature.EdDSA>}
   */
  withDID(id) {
    return Signer.withDID(this, id)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.SignatureView<T, typeof Signature.EdDSA>>}
   */
  async sign(payload) {
    const state = /** @type {{privateKey?: Promise<CryptoKey>}} */ (this)
    const privateKey =
      state.privateKey ||
      webcrypto.subtle.importKey('pkcs8', encodePKCS8(this.secret), ALG, true, [
        'sign',
      ])

    state.privateKey = privateKey

    const raw = new Uint8Array(
      await webcrypto.subtle.sign(ALG, await privateKey, payload)
    )

    return Signature.create(this.signatureCode, raw)
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof this.signatureCode>} signature
   */

  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  get signatureAlgorithm() {
    return signatureAlgorithm
  }
  get signatureCode() {
    return Signature.EdDSA
  }

  encode() {
    return this
  }

  toArchive() {
    const id = this.did()
    return {
      id,
      keys: { [id]: this.encode() },
    }
  }
}

/**
 * @implements {API.EdSigner}
 */
class UnextractableEd25519Signer {
  /**
   * @param {object} options
   * @param {CryptoKey} options.privateKey
   * @param {API.EdVerifier} options.verifier
   */
  constructor({ privateKey, verifier }) {
    this.privateKey = privateKey
    this.verifier = verifier
  }

  /** @type {typeof code} */
  get code() {
    return code
  }

  get signer() {
    return this
  }

  did() {
    return this.verifier.did()
  }

  toDIDKey() {
    return this.verifier.toDIDKey()
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   * @returns {API.Signer<ID, typeof Signature.EdDSA>}
   */
  withDID(id) {
    return Signer.withDID(this, id)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.SignatureView<T, typeof Signature.EdDSA>>}
   */
  async sign(payload) {
    const raw = new Uint8Array(
      await webcrypto.subtle.sign(ALG, this.privateKey, payload)
    )
    return Signature.create(this.signatureCode, raw)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof this.signatureCode>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  get signatureAlgorithm() {
    return signatureAlgorithm
  }

  get signatureCode() {
    return Signature.EdDSA
  }

  /**
   * @returns {API.ByteView<API.EdSigner & CryptoKeyPair>}
   */
  encode() {
    throw new TypeError('Unextractable ed25519 key can not be encoded')
  }

  toArchive() {
    const id = this.did()
    return {
      id,
      keys: { [id]: this.privateKey },
    }
  }
}

/**
 * @param {object} options
 * @param {Uint8Array} options.secret
 * @param {Uint8Array} options.publicKey
 */
const createSigner = ({ secret, publicKey }) => {
  const signer = new Ed25519Signer(SIZE)

  varint.encodeTo(code, signer, 0)
  signer.set(secret, PRIVATE_TAG_SIZE)

  varint.encodeTo(Verifier.code, signer, PRIVATE_TAG_SIZE + KEY_SIZE)
  signer.set(publicKey, PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE)

  return signer
}

/**
 * @param {Uint8Array} secret
 */
const encodePKCS8 = secret => {
  const bytes = new Uint8Array(PKCS8_PREFIX.length + KEY_SIZE)
  bytes.set(PKCS8_PREFIX, 0)
  bytes.set(secret, PKCS8_PREFIX.length)
  return bytes
}

/**
 * @param {Uint8Array} pkcs8
 */
const decodePKCS8 = pkcs8 => {
  if (pkcs8.byteLength !== PKCS8_PREFIX.length + KEY_SIZE) {
    throw new TypeError('Unsupported ed25519 pkcs8 key length')
  }

  for (let i = 0; i < PKCS8_PREFIX.length; i += 1) {
    if (pkcs8[i] !== PKCS8_PREFIX[i]) {
      throw new TypeError('Unsupported ed25519 pkcs8 key format')
    }
  }

  return pkcs8.subarray(PKCS8_PREFIX.length)
}

/**
 * @param {JsonWebKey} jwk
 */
const decodePublicKey = jwk => {
  if (typeof jwk.x !== 'string') {
    throw new TypeError('Can not derive ed25519 public key from JWK')
  }

  const bytes = base64url.baseDecode(jwk.x)
  if (bytes.byteLength !== KEY_SIZE) {
    throw new TypeError(
      `Expected JWK public key with byteLength ${KEY_SIZE} instead not ${bytes.byteLength}`
    )
  }

  return bytes
}

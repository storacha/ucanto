import * as ED25519 from '@noble/ed25519'
import { varint } from 'multiformats'
import * as API from './type.js'
import * as Verifier from './verifier.js'
import { base64pad } from 'multiformats/bases/base64'
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

export const PUB_KEY_OFFSET = PRIVATE_TAG_SIZE + KEY_SIZE

/**
 * Generates new issuer by generating underlying ED25519 keypair.
 * @returns {Promise<API.EdSigner>}
 */
export const generate = () => derive(ED25519.utils.randomPrivateKey())

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

  const publicKey = await ED25519.getPublicKey(secret)
  const signer = new Ed25519Signer(SIZE)

  varint.encodeTo(code, signer, 0)
  signer.set(secret, PRIVATE_TAG_SIZE)

  varint.encodeTo(Verifier.code, signer, PRIVATE_TAG_SIZE + KEY_SIZE)
  signer.set(publicKey, PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE)

  return signer
}

/**
 * @param {API.SignerArchive<API.DID, typeof signatureCode>} archive
 * @returns {API.EdSigner}
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
    const raw = await ED25519.sign(payload, this.secret)

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

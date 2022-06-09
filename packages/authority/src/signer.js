import * as ED25519 from "@noble/ed25519"
import { varint } from "multiformats"
import * as UCAN from "@ipld/dag-ucan"
import * as API from "@ucanto/interface"
import * as Authority from "./authority.js"
import { base64pad } from "multiformats/bases/base64"

export const code = 0x1300
export const name = Authority.name

const PRIVATE_TAG_SIZE = varint.encodingLength(code)
const PUBLIC_TAG_SIZE = varint.encodingLength(Authority.code)
const KEY_SIZE = 32
const SIZE = PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE + KEY_SIZE

/**
 * Generates new issuer by generating underlying ED25519 keypair.
 * @returns {Promise<API.SigningAuthority<typeof Authority.code>>}
 */
export const generate = () => derive(ED25519.utils.randomPrivateKey())

/**
 * Derives issuer from 32 byte long secret key.
 * @param {Uint8Array} secret
 * @returns {Promise<API.SigningAuthority<typeof Authority.code>>}
 */
export const derive = async secret => {
  if (secret.byteLength !== KEY_SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${KEY_SIZE} instead not ${secret.byteLength}`
    )
  }

  const publicKey = await ED25519.getPublicKey(secret)
  const bytes = new Uint8Array(SIZE)

  varint.encodeTo(code, bytes, 0)
  bytes.set(secret, PRIVATE_TAG_SIZE)

  varint.encodeTo(Authority.code, bytes, PRIVATE_TAG_SIZE + KEY_SIZE)
  bytes.set(publicKey, PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE)

  return new SigningAuthority(bytes)
}

/**
 *
 * @param {Uint8Array} bytes
 * @returns {SigningAuthority}
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
    const [code] = varint.decode(bytes.subarray(PRIVATE_TAG_SIZE + KEY_SIZE))
    if (code !== Authority.code) {
      throw new Error(
        `Given bytes must contain public key in multiformats with ${Authority.code} tag`
      )
    }
  }

  return new SigningAuthority(bytes)
}

/**
 * @param {API.SigningAuthority<typeof Authority.code>} signingAuthority
 */
export const encode = ({ bytes }) => bytes

/**
 * @template {string} Prefix
 * @param {API.SigningAuthority<typeof Authority.code>} signingAuthority
 * @param {API.MultibaseEncoder<Prefix>} [encoder]
 */
export const format = ({ bytes }, encoder) =>
  (encoder || base64pad).encode(bytes)

/**
 * @template {string} Prefix
 * @param {string} signingAuthority
 * @param {API.MultibaseDecoder<Prefix>} [decoder]
 * @returns {API.SigningAuthority<typeof Authority.code>}
 */
export const parse = (signingAuthority, decoder) =>
  decode((decoder || base64pad).decode(signingAuthority))

/**
 * @param {API.SigningAuthority<typeof Authority.code>} signingAuthority
 * @returns {UCAN.DID}
 */
export const did = ({ authority }) => authority.did()

/**
 * @implements {API.SigningAuthority<typeof Authority.code>}
 */
class SigningAuthority {
  /**
   * @param {Uint8Array} bytes
   */
  constructor(bytes) {
    this.buffer = bytes.buffer
    this.byteOffset = bytes.byteOffset
    this.byteLength = SIZE
    this.bytes = bytes
  }
  get authority() {
    const bytes = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE + KEY_SIZE)
    const authority = Authority.decode(bytes)

    Object.defineProperties(this, {
      authority: {
        value: authority,
      },
    })

    return authority
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
   * DID of the authority in `did:key` format.
   *
   * @returns {UCAN.DID}
   */
  did() {
    return did(this)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof Authority.code>>}
   */
  sign(payload) {
    return ED25519.sign(payload, this.secret)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof Authority.code>} signature
   */
  verify(payload, signature) {
    return this.authority.verify(payload, signature)
  }
}

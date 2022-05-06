import * as ED25519 from "@noble/ed25519"
import { varint } from "multiformats"
import * as UCAN from "@ipld/dag-ucan"
import * as API from "./api.js"
import * as Authority from "./authority.js"

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
    return this.authority.did()
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

import * as API from './type.js'
import { bls12_381 as bls } from '@noble/curves/bls12-381'
import * as Verifier from './verifier.js'
import * as Signature from '@ipld/dag-ucan/signature'
import * as Signer from '../signer.js'
import { varint } from 'multiformats'
import { base64pad } from 'multiformats/bases/base64'
import { base16 } from 'multiformats/bases/base16'

/** @type {API.MulticodecCode<0x1309, 'bls12-381-private-key'>} */

export const code = 0x1309
export const name = Verifier.name

const PREFIX_SIZE = varint.encodingLength(code)
export const PREFIX = varint.encodeTo(code, new Uint8Array(PREFIX_SIZE))

export const SIZE = 32

export const { signatureCode, signatureAlgorithm } = Verifier

export const generate = async () => derive(bls.utils.randomPrivateKey())

/**
 * Derives issuer from 32 byte long secret key.
 *
 * @param {Uint8Array} secret
 * @returns {API.BLSSigner}
 */
const derive = secret => {
  if (secret.byteLength !== SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${SIZE} instead not ${secret.byteLength}`
    )
  }

  const bytes = new Uint8Array(SIZE + PREFIX_SIZE)

  bytes.set(PREFIX, 0)
  bytes.set(secret, PREFIX_SIZE)

  return new BLSSigner(bytes)
}

/**
 * @param {API.SignerArchive<API.DID, typeof signatureCode>} archive
 * @returns {API.BLSSigner}
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
 * @param {Uint8Array} bytes
 * @returns {API.BLSSigner}
 */
export const decode = bytes => {
  if (bytes.byteLength !== SIZE + PREFIX_SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${
        SIZE + PREFIX_SIZE
      } instead not ${bytes.byteLength}`
    )
  }

  {
    const [keyCode] = varint.decode(bytes)
    if (keyCode !== code) {
      throw new Error(`Given bytes must be a multiformat with ${code} tag`)
    }
  }

  return new BLSSigner(bytes)
}

/**
 * @param {API.BLSSigner} signer
 * @return {API.ByteView<API.BLSSigner & CryptoKeyPair>}
 */
export const encode = signer => {
  const out = signer.encode()

  return out
}

/**
 * @template {string} Prefix
 * @param {API.BLSSigner} signer
 * @param {API.MultibaseEncoder<Prefix>} [encoder]
 */
export const format = (signer, encoder) =>
  (encoder || base64pad).encode(encode(signer))

/**
 * @template {string} Prefix
 * @param {string} principal
 * @param {API.MultibaseDecoder<Prefix>} [decoder]
 * @returns {API.BLSSigner}
 */
export const parse = (principal, decoder) =>
  decode((decoder || base64pad).decode(principal))

/**
 *
 * @param {string} archive
 */
export const fromFilecoinWallet = archive => {
  const bytes = base16.baseDecode(archive)
  const data = JSON.parse(new TextDecoder().decode(bytes))
  if (data.Type !== 'bls') {
    throw new TypeError(`Unsupported key type ${data.Type}`)
  }

  // For whatever reason bytes order is reversed
  const secret = base64pad.baseDecode(data.PrivateKey).reverse()

  return derive(secret)
}

/**
 * @implements {API.BLSSigner}
 */
class BLSSigner {
  /**
   *
   * @param {Uint8Array} bytes
   */
  constructor(bytes) {
    this.bytes = bytes
    /**
     * Raw public key without multiformat code.
     */
    this.secret = bytes.subarray(PREFIX_SIZE)

    /** @type {API.BLSVerifier|undefined} */
    this._verifier
  }

  /**
   * @type {typeof code}
   */
  get code() {
    return code
  }

  /**
   * @type {API.BLSSigner}
   */
  get signer() {
    return this
  }
  /**
   * @type {API.BLSVerifier}
   */
  get verifier() {
    if (!this._verifier) {
      const bytes = new Uint8Array(Verifier.SIZE)
      bytes.set(Verifier.KEY_PREFIX, 0)
      bytes.set(bls.getPublicKey(this.secret), Verifier.KEY_PREFIX.length)

      this._verifier = Verifier.decode(bytes)
    }

    return this._verifier
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
   * @returns {API.Signer<ID, API.SigAlg>}
   */
  withDID(id) {
    return Signer.withDID(this, id)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.SignatureView<T, API.SigAlg>>}
   */
  async sign(payload) {
    const raw = bls.sign(payload, this.secret)

    return Signature.create(signatureCode, raw)
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, API.SigAlg>} signature
   */

  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  /** @type {typeof signatureAlgorithm} */
  get signatureAlgorithm() {
    return signatureAlgorithm
  }

  /** @type {typeof Signature.BLS12381G2} */
  get signatureCode() {
    return Signature.BLS12381G2
  }

  encode() {
    return this.bytes
  }

  toArchive() {
    const id = this.did()
    return {
      id,
      keys: { [id]: this.encode() },
    }
  }

  toFilecoinWallet() {
    const data = JSON.stringify({
      Type: 'bls',
      PrivateKey: base64pad.baseEncode(this.secret.slice().reverse()),
    })

    return base16.baseEncode(new TextEncoder().encode(data))
  }
}

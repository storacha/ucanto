import * as Signature from '@ipld/dag-ucan/signature'
import * as API from './type.js'
import * as varint from '../multiformat.js'
import { base58btc } from 'multiformats/bases/base58'
import { blake2b } from '@noble/hashes/blake2b'
import { base32 } from 'multiformats/bases/base32'
import { base16 } from 'multiformats/bases/base16'
import { bls12_381 as bls } from '@noble/curves/bls12-381'
import * as Verifier from '../verifier.js'
import * as DID from '@ipld/dag-ucan/did'

/**
 * @type {API.MulticodecCode<0xeb, 'BLS12-381'>}
 * @see https://w3c-ccg.github.io/did-method-key/#bls-12381
 */
export const code = 0xeb

export const name = /** @type {const} */ ('BLS12-381')

/**
 * @type {API.MulticodecCode<0xd0eb, 'BLS12381G2'>}
 */
export const signatureCode = Signature.BLS12381G2

export const signatureAlgorithm = 'BLS12381G2'
const SIGNATURE_TAG_SIZE = varint.encodingLength(code)

const RAW_SIGNATURE_SIZE = 96
const RAW_KEY_SIZE = 48
const CHECKSUM_SIZE = 4
export const SIGNATURE_SIZE =
  RAW_SIGNATURE_SIZE + varint.encodingLength(signatureCode)
export const KEY_PREFIX = varint.encodeTo(
  code,
  new Uint8Array(varint.encodingLength(code))
)

export const SIZE = KEY_PREFIX.length + RAW_KEY_SIZE

/**
 * Parses `did:key:` string as a VerifyingPrincipal.
 *
 * @param {API.DID|string} did
 * @returns {API.BLSVerifier}
 */
export const parse = did => decode(DID.parse(did))

/**
 * Formats given Principal into `did:key:` format.
 *
 * @param {API.Principal<API.DID>} principal
 */
export const format = principal => DID.format(principal)

/**
 * Encodes given Principal by tagging it's ed25519 public key with `0xed`
 * multiformat code.
 *
 * @param {API.Principal<API.DID<"key">>} principal
 */
export const encode = principal => DID.encode(principal)

const SIGNATURE_PROTOCOL = 3

/**
 * Signature types filecoin network has to sign transactions
 */
export const SIGNATURES = /** @type {const} */ ({
  BLS: `${SIGNATURE_PROTOCOL}`,
})

/** @type {Set<string>} */
const SUPPORTED_PROTOCOL = new Set(Object.values(SIGNATURES))

/**
 * Filecoin network prefixes
 */
export const NETWORKS = /** @type {const} */ ({
  mainnet: 'f',
  testnet: 't',
})

/** @type {Set<string>} */
const SUPPORTED_NETWORKS = new Set(Object.values(NETWORKS))

/**
 * @param {string} address
 * @returns {API.BLSVerifier}
 */
export const fromFilecoinAddress = address => {
  const [network, protocol] = address
  if (!SUPPORTED_NETWORKS.has(network)) {
    throw new RangeError(
      `Address has unsupported network identifier: ${network}, expected one of ${[
        ...SUPPORTED_NETWORKS,
      ].join(', ')}`
    )
  }

  if (!SUPPORTED_PROTOCOL.has(protocol)) {
    throw new RangeError(
      `Address has unsupported protocol identifier: ${protocol}, expected one of ${[
        ...SUPPORTED_PROTOCOL,
      ].join(', ')}`
    )
  }

  const bytes = base32.baseDecode(address.slice(2))
  const key = bytes.subarray(0, -CHECKSUM_SIZE)
  const checksum = bytes.subarray(-CHECKSUM_SIZE)

  if (checksum.join('') !== computeChecksum(key).join('')) {
    throw new TypeError('Address has invalid checksum')
  }

  const buffer = new Uint8Array(SIZE)
  buffer.set(KEY_PREFIX, 0)
  buffer.set(key, KEY_PREFIX.length)

  return new BLSVerifier(buffer)
}

/**
 *
 * @param {Uint8Array} key
 */
const computeChecksum = key => {
  const payload = new Uint8Array(key.length + 1)
  payload[0] = SIGNATURE_PROTOCOL
  payload.set(key, 1)

  return blake2b(payload, { dkLen: CHECKSUM_SIZE })
}

/**
 *
 * @param {Uint8Array} bytes
 * @returns {API.BLSVerifier}
 */
export const decode = bytes => {
  const [algorithm] = varint.decode(bytes)
  if (algorithm !== code) {
    throw new RangeError(
      `Unsupported key algorithm with multicode 0x${code.toString(16)}`
    )
  } else if (bytes.byteLength !== SIZE) {
    throw new RangeError(
      `Expected Uint8Array with byteLength ${SIZE}, instead got Uint8Array with byteLength ${bytes.byteLength}`
    )
  } else {
    return new BLSVerifier(bytes)
  }
}

/**
 * @implements {API.BLSVerifier}
 */
class BLSVerifier {
  /**
   * @param {Uint8Array} bytes
   */
  constructor(bytes) {
    this.bytes = bytes
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

  /**
   * Raw public key without a multiformat code.
   *
   * @readonly
   */
  get publicKey() {
    if (!this._publicKey) {
      this._publicKey = this.bytes.subarray(KEY_PREFIX.length)
    }

    return this._publicKey
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
   * @param {API.Signature<T, Signature.BLS12381G2>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    return (
      signature.code === signatureCode &&
      bls.verify(signature.raw, payload, this.publicKey)
    )
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   * @returns {API.Verifier<ID, typeof signatureCode>}
   */
  withDID(id) {
    return Verifier.withDID(this, id)
  }

  toDIDKey() {
    return this.did()
  }

  /**
   * @param {typeof NETWORKS[keyof NETWORKS]} network
   */
  toFilecoinAddress(network = NETWORKS.mainnet) {
    if (!SUPPORTED_NETWORKS.has(network)) {
      throw new RangeError(
        `Unsupported network identifier: ${network}, expected one of ${[
          ...SUPPORTED_NETWORKS,
        ].join(', ')}`
      )
    }

    const { publicKey } = this
    const payload = new Uint8Array(publicKey.length + CHECKSUM_SIZE)
    payload.set(publicKey, 0)
    payload.set(computeChecksum(publicKey), publicKey.length)

    return `${network}${SIGNATURES.BLS}${base32.baseEncode(payload)}`
  }
}

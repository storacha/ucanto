import * as API from '@ucanto/interface'
import {
  encodeSequence,
  encodeBitString,
  enterSequence,
  skipSequence,
  readBitString,
} from './asn1.js'

/**
 * @typedef {import('./public-key.js').RSAPublicKey} RSAPublicKey
 */
/**
 * Described in RFC 5208 Section 4.1: https://tools.ietf.org/html/rfc5280#section-4.1
 * ```
 * SubjectPublicKeyInfo  ::=  SEQUENCE  {
 *    algorithm            AlgorithmIdentifier,
 *    subjectPublicKey     BIT STRING  }
 * ```
 *
 * @typedef {object} SubjectPublicKeyInfo
 * @property {API.ByteView<AlgorithmIdentifier>} algorithm
 * @property {API.ByteView<RSAPublicKey>} subjectPublicKey
 * @typedef {import('./pkcs8.js').AlgorithmIdentifier} AlgorithmIdentifier
 */

/**
 * The ASN.1 DER encoded header that needs to be added to an
 * ASN.1 DER encoded RSAPublicKey to make it a SubjectPublicKeyInfo.
 *
 * This byte sequence is always the same.
 *
 * A human-readable version of this as part of a dumpasn1 dump:
 *
 *     SEQUENCE {
 *       OBJECT IDENTIFIER rsaEncryption (1 2 840 113549 1 1 1)
 *       NULL
 *     }
 *
 * See https://github.com/ucan-wg/ts-ucan/issues/30
 */
export const SPKI_PARAMS_ENCODED = new Uint8Array([
  48, 13, 6, 9, 42, 134, 72, 134, 247, 13, 1, 1, 1, 5, 0,
])

/**
 * @param {API.ByteView<RSAPublicKey>} key
 * @returns {API.ByteView<SubjectPublicKeyInfo>}
 */
export const encode = key =>
  encodeSequence([SPKI_PARAMS_ENCODED, encodeBitString(key)])

/**
 *
 * @param {API.ByteView<SubjectPublicKeyInfo>} info
 * @returns {API.ByteView<RSAPublicKey>}
 */
export const decode = info => {
  // go into the top-level SEQUENCE
  const offset = enterSequence(info, 0)
  // skip the header we expect (SKPI_PARAMS_ENCODED)
  const keyOffset = skipSequence(info, offset)

  // we expect the bitstring next
  return readBitString(info, keyOffset)
}

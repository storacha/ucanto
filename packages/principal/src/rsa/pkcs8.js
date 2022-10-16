import * as API from '@ucanto/interface'
import { base64url } from 'multiformats/bases/base64'
import {
  encodeSequence,
  encodeOctetString,
  enterSequence,
  skipSequence,
  skipInt,
  readOctetString,
} from './asn1.js'

const PKSC8_HEADER = new Uint8Array([
  // version
  2, 1, 0,
  // privateKeyAlgorithm
  48, 13, 6, 9, 42, 134, 72, 134, 247, 13, 1, 1, 1, 5, 0,
])
/**
 * @typedef {import('./private-key').RSAPrivateKey} RSAPrivateKey
 * @typedef {object} AlgorithmIdentifier
 * @property {Uint8Array} version
 * @property {Uint8Array} parameters
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5208#section-5
 * @typedef {object} PrivateKeyInfo
 * @property {API.ByteView<number>} version
 * @property {API.ByteView<AlgorithmIdentifier>} privateKeyAlgorithm
 * @property {API.ByteView<RSAPrivateKey>} privateKey
 * @property {API.ByteView<unknown>} [attributes]
 */

/**
 * @param {API.ByteView<PrivateKeyInfo>} info
 * @returns {API.ByteView<RSAPrivateKey>}
 */
export const decode = info => {
  let offset = 0
  // go into the top-level SEQUENCE
  offset = enterSequence(info, offset)
  offset = skipInt(info, offset)
  offset = skipSequence(info, offset)

  // we expect the bitstring next
  return readOctetString(info, offset)
}

/**
 * @param {API.ByteView<RSAPrivateKey>} key
 * @returns {API.ByteView<PrivateKeyInfo>}
 */
export const encode = key =>
  encodeSequence([PKSC8_HEADER, encodeOctetString(key)])

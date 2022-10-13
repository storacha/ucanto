import * as API from '@ucanto/interface'
import { encodeSequence, readInt, encodeInt, readSequenceWith } from './asn1.js'
import * as SPKI from './spki.js'
import { base64url } from 'multiformats/bases/base64'
/**
 * RSA public key represenatation
 * @see https://datatracker.ietf.org/doc/html/rfc3447#appendix-A.1
 *
 * @typedef {object} RSAPublicKey
 * @property {API.ByteView<number>} n
 * @property {API.ByteView<number>} e
 */

/**
 * Takes private-key information in [Private-Key Information Syntax](https://datatracker.ietf.org/doc/html/rfc5208#section-5)
 * and extracts all the fields as per [RSA private key syntax](https://datatracker.ietf.org/doc/html/rfc3447#appendix-A.1.2)
 *
 *
 * @param {API.ByteView<RSAPublicKey>} key
 * @param {number} byteOffset
 * @returns {RSAPublicKey}
 */
export const decode = (key, byteOffset = 0) => {
  const [n, e] = readSequenceWith([readInt, readInt], key, byteOffset)

  return { n, e }
}

/**
 * @param {RSAPublicKey} key
 * @returns {API.ByteView<RSAPublicKey>}
 */
export const encode = ({ n, e }) => encodeSequence([encodeInt(n), encodeInt(e)])

/**
 * @param {RSAPublicKey} key
 */
export const toSPKI = key => SPKI.encode(encode(key))

/**
 * @param {API.ByteView<SPKI.SubjectPublicKeyInfo>} info
 */
export const fromSPKI = info => decode(SPKI.decode(info))

/**
 * @param {RSAPublicKey} key
 * @returns {JsonWebKey}
 */
export const toJWK = ({ n, e }) => ({
  kty: 'RSA',
  alg: 'RS256',
  key_ops: ['verify'],
  ext: true,
  n: base64url.baseEncode(n),
  e: base64url.baseEncode(e),
})

/**
 * @param {JsonWebKey} jwk
 * @returns {RSAPublicKey}
 */
export const fromJWK = ({ n, e }) => ({
  n: base64urlDecode(n),
  e: base64urlDecode(e),
})

/**
 * @param {string|undefined} input
 */
const base64urlDecode = (input = '') => base64url.baseDecode(input)

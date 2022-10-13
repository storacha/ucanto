import * as API from '@ucanto/interface'
import { encodeSequence, readInt, readSequenceWith, encodeInt } from './asn1.js'
import { base64url } from 'multiformats/bases/base64'
import * as PKCS8 from './pkcs8.js'
import * as SPKI from './spki.js'
import * as PublicKey from './public-key.js'

export const code = 0x1305
const VERSION = new Uint8Array()

/**
 * @see https://datatracker.ietf.org/doc/html/rfc3447#appendix-A.1.2
 * @typedef {object} RSAPrivateKey
 * @property {Uint8Array} v
 * @property {Uint8Array} n
 * @property {Uint8Array} e
 * @property {Uint8Array} d
 * @property {Uint8Array} p
 * @property {Uint8Array} q
 * @property {Uint8Array} dp
 * @property {Uint8Array} dq
 * @property {Uint8Array} qi
 */

/**
 * Takes private-key information in [Private-Key Information Syntax](https://datatracker.ietf.org/doc/html/rfc5208#section-5)
 * and extracts all the fields as per [RSA private key syntax](https://datatracker.ietf.org/doc/html/rfc3447#appendix-A.1.2)
 *
 *
 * @param {API.ByteView<RSAPrivateKey>} source
 * @param {number} byteOffset
 * @returns {RSAPrivateKey}
 */
export const decode = (source, byteOffset = 0) => {
  const [v, n, e, d, p, q, dp, dq, qi] = readSequenceWith(
    [
      readInt,
      readInt,
      readInt,
      readInt,
      readInt,
      readInt,
      readInt,
      readInt,
      readInt,
    ],
    source,
    byteOffset
  )

  return { v, n, e, d, p, q, dp, dq, qi }
}

/**
 * @param {RSAPrivateKey} key
 * @returns {API.ByteView<RSAPrivateKey>}
 */
export const encode = ({ v, n, e, d, p, q, dp, dq, qi }) => {
  return encodeSequence([
    encodeInt(v),
    encodeInt(n),
    encodeInt(e),
    encodeInt(d),
    encodeInt(p),
    encodeInt(q),
    encodeInt(dp),
    encodeInt(dq),
    encodeInt(qi),
  ])
}

/**
 * @param {RSAPrivateKey} key
 * @returns {JsonWebKey}
 */
export const toJWK = ({ n, e, d, p, q, dp, dq, qi }) => ({
  kty: 'RSA',
  alg: 'RS256',
  key_ops: ['sign'],
  ext: true,
  n: base64url.baseEncode(n),
  e: base64url.baseEncode(e),
  d: base64url.baseEncode(d),
  p: base64url.baseEncode(p),
  q: base64url.baseEncode(q),
  dp: base64url.baseEncode(dp),
  dq: base64url.baseEncode(dq),
  qi: base64url.baseEncode(qi),
})

/**
 * @param {JsonWebKey} key
 * @returns {RSAPrivateKey}
 */
export const fromJWK = ({ n, e, d, p, q, dp, dq, qi }) => ({
  v: VERSION,
  n: base64urlDecode(n),
  e: base64urlDecode(e),
  d: base64urlDecode(d),
  p: base64urlDecode(p),
  q: base64urlDecode(q),
  dp: base64urlDecode(dp),
  dq: base64urlDecode(dq),
  qi: base64urlDecode(qi),
})

/**
 * @param {RSAPrivateKey} key
 */
export const toPKCS8 = key => PKCS8.encode(encode(key))

/**
 * @param {API.ByteView<PKCS8.PrivateKeyInfo>} info
 */
export const fromPKCS8 = info => decode(PKCS8.decode(info))

/**
 * @param {RSAPrivateKey} key
 */
export const toSPKI = key => SPKI.encode(PublicKey.encode(key))

/**
 *
 * @param {string|undefined} input
 * @returns
 */
const base64urlDecode = (input = '') => base64url.baseDecode(input)

import { webcrypto } from 'one-webcrypto'
import { varint } from 'multiformats'
import * as API from '@ucanto/interface'
import { encodeBitString, encodeSequence } from './rsa/asn1.js'

/**
 * @template {number} Code
 * @param {Code} code
 * @param {CryptoKey} key
 * @returns {Promise<API.ByteView<CryptoKey>>}
 */

export const importKey = async (code, key) => {
  const buffer = await webcrypto.subtle.exportKey('raw', key)
  const offset = varint.encodingLength(code)
  const bytes = new Uint8Array(buffer.byteLength + offset)
  varint.encodeTo(code, bytes, 0)
  bytes.set(new Uint8Array(buffer), offset)
  return bytes
}

/**
 *
 * @param {number} code
 * @param {Uint8Array} bytes
 */
export const tagWith = (code, bytes) => {
  const offset = varint.encodingLength(code)
  const multiformat = new Uint8Array(bytes.byteLength + offset)
  varint.encodeTo(code, multiformat, 0)
  multiformat.set(bytes, offset)

  return multiformat
}

/**
 * @param {number} code
 * @param {Uint8Array} source
 * @param {number} byteOffset
 * @returns
 */
export const untagWith = (code, source, byteOffset = 0) => {
  const bytes = byteOffset !== 0 ? source.subarray(byteOffset) : source
  const [tag, size] = varint.decode(bytes)
  if (tag !== code) {
    throw new Error(
      `Expected multiformat with 0x${code.toString(
        16
      )} tag instead got 0x${tag.toString(16)}`
    )
  } else {
    return new Uint8Array(bytes.buffer, bytes.byteOffset + size)
  }
}

/**
 * @template {number} Code
 * @param {Code} code
 * @param {CryptoKey} key
 * @returns {Promise<API.ByteView<CryptoKey>>}
 */

export const exportKey = async (code, key) => {
  const buffer = await webcrypto.subtle.exportKey('raw', key)
  const offset = varint.encodingLength(code)
  const size = offset + buffer.byteLength

  const bytes = new Uint8Array(size)
  varint.encodeTo(code, bytes, 0)
  bytes.set(new Uint8Array(buffer), offset)

  return bytes
}

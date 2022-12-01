import { varint } from 'multiformats'

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

export const encodingLength = varint.encodingLength
export const encodeTo = varint.encodeTo
export const decode = varint.decode

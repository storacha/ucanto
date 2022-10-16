/**
 * ASN1 Tags as per https://luca.ntop.org/Teaching/Appunti/asn1.html
 */
const TAG_SIZE = 1
export const INT_TAG = 0x02
export const BITSTRING_TAG = 0x03
export const OCTET_STRING_TAG = 0x04
export const NULL_TAG = 0x05
export const OBJECT_TAG = 0x06
export const SEQUENCE_TAG = 0x30

export const UNUSED_BIT_PAD = 0x00

/**
 * @param {number} length
 * @returns {Uint8Array}
 */
export const encodeDERLength = length => {
  if (length <= 127) {
    return new Uint8Array([length])
  }

  /** @type {number[]} */
  const octets = []
  while (length !== 0) {
    octets.push(length & 0xff)
    length = length >>> 8
  }
  octets.reverse()
  return new Uint8Array([0x80 | (octets.length & 0xff), ...octets])
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {{number: number, consumed: number}}
 */
export const readDERLength = (bytes, offset = 0) => {
  if ((bytes[offset] & 0x80) === 0) {
    return { number: bytes[offset], consumed: 1 }
  }

  const numberBytes = bytes[offset] & 0x7f
  /* c8 ignore next 5 */
  if (bytes.length < numberBytes + 1) {
    throw new Error(
      `ASN parsing error: Too few bytes. Expected encoded length's length to be at least ${numberBytes}`
    )
  }

  let length = 0
  for (let i = 0; i < numberBytes; i++) {
    length = length << 8
    length = length | bytes[offset + i + 1]
  }

  return { number: length, consumed: numberBytes + 1 }
}

/**
 * @param {Uint8Array} input
 * @param {number} expectedTag
 * @param {number} position
 * @returns {number}
 */
export const skip = (input, expectedTag, position) => {
  const parsed = into(input, expectedTag, position)
  return parsed.position + parsed.length
}

/**
 * @param {Uint8Array} input
 * @param {number} expectedTag
 * @param {number} offset
 * @returns {{ position: number, length: number }}
 */
export const into = (input, expectedTag, offset) => {
  const actualTag = input[offset]
  /* c8 ignore next 7 */
  if (actualTag !== expectedTag) {
    throw new Error(
      `ASN parsing error: Expected tag 0x${expectedTag.toString(
        16
      )} at position ${offset}, but got 0x${actualTag.toString(16)}.`
    )
  }

  // length
  const length = readDERLength(input, offset + TAG_SIZE)
  const position = offset + TAG_SIZE + length.consumed

  // content
  return { position, length: length.number }
}

/**
 * @param {Uint8Array} input
 */
export const encodeBitString = input => {
  // encode input length + 1 for unused bit pad
  const length = encodeDERLength(input.byteLength + 1)
  // allocate a buffer of desired size
  const bytes = new Uint8Array(
    TAG_SIZE + // ASN_BITSTRING_TAG
      length.byteLength +
      1 + // amount of unused bits at the end of our bitstring
      input.byteLength
  )

  let byteOffset = 0
  // write bytestring tag
  bytes[byteOffset] = BITSTRING_TAG
  byteOffset += TAG_SIZE

  // write length of the bytestring
  bytes.set(length, byteOffset)
  byteOffset += length.byteLength

  // write unused bits at the end of our bitstring
  bytes[byteOffset] = UNUSED_BIT_PAD
  byteOffset += 1

  // write actual data into bitstring
  bytes.set(input, byteOffset)

  return bytes
}

/**
 * @param {Uint8Array} input
 */
export const encodeOctetString = input => {
  // encode input length
  const length = encodeDERLength(input.byteLength)
  // allocate a buffer of desired size
  const bytes = new Uint8Array(TAG_SIZE + length.byteLength + input.byteLength)

  let byteOffset = 0
  // write octet string tag
  bytes[byteOffset] = OCTET_STRING_TAG
  byteOffset += TAG_SIZE

  // write octet string length
  bytes.set(length, byteOffset)
  byteOffset += length.byteLength

  // write actual data into bitstring
  bytes.set(input, byteOffset)

  return bytes
}

/**
 * @param {Uint8Array[]} sequence
 */
export const encodeSequence = sequence => {
  // calculate bytelength for all the parts
  let byteLength = 0
  for (const item of sequence) {
    byteLength += item.byteLength
  }

  // encode sequence byte length
  const length = encodeDERLength(byteLength)

  // allocate the buffer to write sequence into
  const bytes = new Uint8Array(TAG_SIZE + length.byteLength + byteLength)

  let byteOffset = 0

  // write the sequence tag
  bytes[byteOffset] = SEQUENCE_TAG
  byteOffset += TAG_SIZE

  // write sequence length
  bytes.set(length, byteOffset)
  byteOffset += length.byteLength

  // write each item in the sequence
  for (const item of sequence) {
    bytes.set(item, byteOffset)
    byteOffset += item.byteLength
  }

  return bytes
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 */
export const readSequence = (bytes, offset = 0) => {
  const { position, length } = into(bytes, SEQUENCE_TAG, offset)

  return new Uint8Array(bytes.buffer, bytes.byteOffset + position, length)
}

/**
 * @param {Uint8Array} input
 */
export const encodeInt = input => {
  const extra = input.byteLength === 0 || input[0] & 0x80 ? 1 : 0

  // encode input length
  const length = encodeDERLength(input.byteLength + extra)
  // allocate a buffer of desired size
  const bytes = new Uint8Array(
    TAG_SIZE + // INT_TAG
      length.byteLength +
      input.byteLength +
      extra
  )

  let byteOffset = 0
  // write octet string tag
  bytes[byteOffset] = INT_TAG
  byteOffset += TAG_SIZE

  // write int length
  bytes.set(length, byteOffset)
  byteOffset += length.byteLength

  // add 0 if the most-significant bit is set
  if (extra > 0) {
    bytes[byteOffset] = UNUSED_BIT_PAD
    byteOffset += extra
  }

  // write actual data into bitstring
  bytes.set(input, byteOffset)

  return bytes
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {number}
 */

export const enterSequence = (bytes, offset = 0) =>
  into(bytes, SEQUENCE_TAG, offset).position

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {number}
 */
export const skipSequence = (bytes, offset = 0) =>
  skip(bytes, SEQUENCE_TAG, offset)

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {number}
 */
export const skipInt = (bytes, offset = 0) => skip(bytes, INT_TAG, offset)

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {Uint8Array}
 */
export const readBitString = (bytes, offset = 0) => {
  const { position, length } = into(bytes, BITSTRING_TAG, offset)
  const tag = bytes[position]
  /* c8 ignore next 5 */
  if (tag !== UNUSED_BIT_PAD) {
    throw new Error(
      `Can not read bitstring, expected length to be multiple of 8, but got ${tag} unused bits in last byte.`
    )
  }

  return new Uint8Array(
    bytes.buffer,
    bytes.byteOffset + position + 1,
    length - 1
  )
}

/**
 * @param {Uint8Array} bytes
 * @param {number} byteOffset
 * @returns {Uint8Array}
 */
export const readInt = (bytes, byteOffset = 0) => {
  const { position, length } = into(bytes, INT_TAG, byteOffset)
  let delta = 0

  // drop leading 0s
  while (bytes[position + delta] === 0) {
    delta++
  }

  return new Uint8Array(
    bytes.buffer,
    bytes.byteOffset + position + delta,
    length - delta
  )
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {Uint8Array}
 */
export const readOctetString = (bytes, offset = 0) => {
  const { position, length } = into(bytes, OCTET_STRING_TAG, offset)

  return new Uint8Array(bytes.buffer, bytes.byteOffset + position, length)
}

/**
 * @typedef {(bytes:Uint8Array, offset:number) => Uint8Array} Reader
 * @param {[Reader, ...Reader[]]} readers
 * @param {Uint8Array} source
 * @param {number} byteOffset
 */
export const readSequenceWith = (readers, source, byteOffset = 0) => {
  const results = []
  const sequence = readSequence(source, byteOffset)
  let offset = 0
  for (const read of readers) {
    const chunk = read(sequence, offset)
    results.push(chunk)
    offset = chunk.byteOffset + chunk.byteLength - sequence.byteOffset
  }
  return results
}

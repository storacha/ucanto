export const encoder = new TextEncoder()
export const decoder = new TextDecoder()

/**
 * @param {string} text
 * @returns {Uint8Array}
 */
export const encode = text => encoder.encode(text)

/**
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const decode = bytes => decoder.decode(bytes)

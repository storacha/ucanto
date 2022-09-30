import * as API from '@ucanto/interface'

/**
 * @param {API.IntoSigner[]} options
 */
export const create = options => ({
  create,
  /**
   * @param {Uint8Array} bytes
   */
  decode: bytes => {
    for (const option of options) {
      try {
        return option.decode(bytes)
      } catch (_) {}
    }
    throw new Error(`Unsupported signer`)
  },
})

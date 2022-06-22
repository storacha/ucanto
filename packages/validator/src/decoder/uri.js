import * as API from '@ucanto/interface'
import { Failure } from '../error.js'

/**
 * @template {`${string}:`} Protocol
 * @param {unknown} input
 * @param {{protocol?: Protocol}} [options]
 * @return {API.Result<API.URI<Protocol>, API.Failure>}
 */
export const decode = (input, { protocol } = {}) => {
  try {
    const url = new URL(String(input))
    if (protocol != null && url.protocol !== protocol) {
      return new Failure(`Expected ${protocol} URI instead got ${url.href}`)
    } else {
      return /** @type {API.URI<Protocol>} */ (url)
    }
  } catch (_) {
    return new Failure(`Invalid URI`)
  }
}

/**
 * @template {`${string}:`} Protocol
 * @param {{protocol: Protocol}} options
 * @returns {API.Decoder<unknown, API.URI<Protocol>, API.Failure>}
 */
export const match = (options) => ({
  decode: (input) => decode(input, options),
})

/**
 * @template {`${string}:`} Protocol
 * @typedef {`${Protocol}${string}`} URIString
 */

/**
 * @template {string} Schema
 * @param {{protocol?: API.Protocol<Schema>}} [options]
 * @returns {API.Decoder<unknown, `${Schema}:${string}`, API.Failure>}
 */
export const string = (options) => ({
  decode: (input) => {
    const result = decode(input, options)
    return result.error ? result : result.href
  },
})

import * as API from '@ucanto/interface'
import { Failure } from '../error.js'

/**
 * @template {`${string}:`} Protocol
 * @param {string} input
 * @param {{protocol?: Protocol}} [options]
 */
export const decode = (input, { protocol } = {}) => {
  try {
    const url = new URL(input)
    if (protocol != null && url.protocol !== protocol) {
      return new Failure(`Expected ${protocol} URI instead got ${url.href}`)
    } else {
      return /** @type {URL & {protocol:Protocol}} */ (url)
    }
  } catch (_) {
    return new Failure(`Invalid URI`)
  }
}

/**
 * @template {`${string}:`} Protocol
 * @param {{protocol: Protocol}} options
 * @returns {API.Decoder<string, URL & { protocol: Protocol }, API.Failure>}
 */
export const match = (options) => ({
  decode: (input) => decode(input, options),
})

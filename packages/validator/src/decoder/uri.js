import * as API from '@ucanto/interface'
import { Failure } from '../error.js'

/**
 * @template {API.Protocol} P
 * @param {unknown} input
 * @param {{protocol?: P}} options
 * @return {API.Result<API.URI<P>, API.Failure>}
 */
export const decode = (input, { protocol } = {}) => {
  if (typeof input !== 'string' && !(input instanceof URL)) {
    return new Failure(
      `Expected URI but got ${input === null ? 'null' : typeof input}`
    )
  }

  try {
    const url = new URL(String(input))
    if (protocol != null && url.protocol !== protocol) {
      return new Failure(`Expected ${protocol} URI instead got ${url.href}`)
    } else {
      return /** @type {API.URI<P>} */ (url.href)
    }
  } catch (_) {
    return new Failure(`Invalid URI`)
  }
}

/**
 * @template {{protocol: API.Protocol}} Options
 * @param {Options} options
 * @returns {API.Decoder<unknown, API.URI<Options['protocol']>, API.Failure>}
 */
export const match = options => ({
  decode: input => decode(input, options),
})

/**
 * @template {{protocol: API.Protocol}} Options
 * @param {Options} options
 * @returns {API.Decoder<unknown, undefined|API.URI<Options['protocol']>, API.Failure>}
 */

export const optional = options => ({
  decode: input => {
    if (input === undefined) {
      return undefined
    } else {
      return decode(input, options)
    }
  },
})

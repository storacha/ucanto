import * as API from '@ucanto/interface'
import { Failure } from '../error.js'

/**
 * @template {string} M
 * @param {unknown} source
 * @param {{method?: M}} options
 * @return {API.Result<API.DID<M> & API.URI<"did:">, API.Failure>}
 */
export const decode = (source, { method } = {}) => {
  const prefix = method ? `did:${method}:` : `did:`
  if (typeof source != 'string') {
    return new Failure(
      `Expected a string but got ${
        source === null ? null : typeof source
      } instead`
    )
  } else if (!source.startsWith(prefix)) {
    return new Failure(`Expected a ${prefix} but got "${source}" instead`)
  } else {
    return /** @type {API.DID<M>} */ (source)
  }
}

/**
 * @template {string} M
 * @param {{method: M}} options
 * @returns {API.Decoder<unknown, API.DID<M> & API.URI<"did:">, API.Failure>}
 */
export const match = options => ({
  decode: input => decode(input, options),
})

/**
 * @template {string} M
 * @param {{method?: M}} options
 * @returns {API.Decoder<unknown, undefined|(API.DID<M> & API.URI<"did:">), API.Failure>}
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

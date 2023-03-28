import * as API from '@ucanto/interface'
import * as CAR from './car/codec.js'
import * as request from './car/request.js'
import * as response from './car/response.js'

export { CAR as codec, request, response }

const HEADERS = Object.freeze({
  'content-type': 'application/car',
})

/**
 * @deprecated
 * @template {API.Tuple<API.IssuedInvocation>} I
 * @param {I} invocations
 * @param {API.EncodeOptions & { headers?: Record<string, string> }} [options]
 * @returns {Promise<API.HTTPRequest<I>>}
 */
export const encode = (invocations, options) =>
  request.encode(invocations, { headers: HEADERS, ...options })

/**
 * @deprecated
 */
export const decode = request.decode

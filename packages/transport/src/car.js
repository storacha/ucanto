import * as API from '@ucanto/interface'
import * as CAR from './car/codec.js'
import * as request from './car/request.js'
import * as response from './car/response.js'
import * as Selector from './codec.js'

export { CAR as codec, request, response }

export const contentType = 'application/car'

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

export const inbound = Selector.inbound({
  decoders: {
    'application/car': request,
  },
  encoders: {
    'application/car': response,
  },
})

export const outbound = Selector.outbound({
  encoders: {
    'application/car': request,
  },
  decoders: {
    'application/car': response,
  },
})

import * as API from '@ucanto/interface'
import * as CBOR from './cbor/codec.js'

const HEADERS = Object.freeze({
  'content-type': 'application/cbor',
})

export const codec = CBOR

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template I
 * @param {I} result
 * @returns {API.HTTPResponse<I>}
 */
export const encode = result => {
  return {
    headers: new Headers(HEADERS),
    body: CBOR.encode(result),
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template I
 * @param {API.HTTPResponse<I>} request
 * @returns {Promise<I>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers.get('content-type')
  if (contentType !== 'application/cbor') {
    throw TypeError(
      `Only 'content-type: application/cbor' is supported, instead got '${contentType}'`
    )
  }

  return CBOR.decode(body)
}

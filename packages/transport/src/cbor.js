import * as API from "@ucanto/interface"
import * as CBOR from "@ipld/dag-cbor"

const HEADERS = Object.freeze({
  "content-type": "application/cbor",
})

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template {API.Invocation[]} I
 * @param {API.ExecuteBatchInvocation<I, API.BatchInvocationService<I>>} result
 * @returns {API.HTTPResponse<API.ExecuteBatchInvocation<I, API.BatchInvocationService<I>>>}
 */
export const encode = result => {
  return {
    headers: HEADERS,
    body: CBOR.encode(result),
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template {API.Invocation[]} I
 * @param {API.HTTPResponse<API.ExecuteBatchInvocation<I, API.BatchInvocationService<I>>>} request
 * @returns {Promise<API.ExecuteBatchInvocation<I, API.BatchInvocationService<I>>>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers["content-type"] || headers["Content-Type"]
  if (contentType !== "application/cbor") {
    throw TypeError(
      `Only 'content-type: application/cbor' is supported, intsead got '${contentType}'`
    )
  }

  return CBOR.decode(body)
}

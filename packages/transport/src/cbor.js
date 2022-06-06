import * as API from "@ucanto/interface"
import * as CBOR from "@ipld/dag-cbor"
import { CID } from "multiformats/cid"

const HEADERS = Object.freeze({
  "content-type": "application/cbor",
})

JSON.stringify

/**
 * @param {unknown} data
 * @returns {unknown}
 */
const prepare = (data, seen = new Set()) => {
  if (seen.has(data)) {
    throw new TypeError("Can not encode circular structure")
  }
  // top level undefined is ok
  if (data === undefined && seen.size === 0) {
    return null
  }

  if (data === null) {
    return null
  }

  if (typeof data === "symbol" && seen.size === 0) {
    return null
  }

  const cid = CID.asCID(data)
  if (cid) {
    return cid
  }

  if (Array.isArray(data)) {
    seen.add(data)
    const items = []
    for (const item of data) {
      items.push(
        item === undefined || typeof item === "symbol"
          ? null
          : prepare(item, seen)
      )
    }
    return items
  }

  if (typeof (/** @type {{toJSON?:unknown}} */ (data).toJSON) === "function") {
    seen.add(data)
    const json = /** @type {{toJSON():unknown}} */ (data).toJSON()
    return prepare(json, seen)
  }

  if (typeof data === "object") {
    seen.add(data)
    /** @type {Record<string, unknown>} */
    const object = {}
    for (const [key, value] of Object.entries(data)) {
      object[key] = prepare(value, seen)
    }
    return object
  }

  return data
}

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template I
 * @param {I} result
 * @returns {API.HTTPResponse<I>}
 */
export const encode = result => {
  return {
    headers: HEADERS,
    body: CBOR.encode(prepare(result)),
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
  const contentType = headers["content-type"] || headers["Content-Type"]
  if (contentType !== "application/cbor") {
    throw TypeError(
      `Only 'content-type: application/cbor' is supported, intsead got '${contentType}'`
    )
  }

  return CBOR.decode(body)
}

import * as API from "@ucanto/interface"
import * as UCAN from "@ipld/dag-ucan"
import * as UTF8 from "./utf8.js"
import { Delegation } from "@ucanto/core"

const HEADER_PREFIX = "x-auth-"

const HEADERS = Object.freeze({
  "content-type": "application/json",
})

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template {API.IssuedInvocation[]} I
 * @param {I} batch
 * @returns {Promise<API.HTTPRequest<API.InferInvocation<API.IssuedInvocation[]>>>}
 */
export const encode = async batch => {
  /** @type {Record<string, string>} */
  const headers = { ...HEADERS }
  /** @type {string[]} */
  const body = []
  for (const invocation of batch) {
    const delegation = await Delegation.delegate(invocation)

    body.push(`${delegation.cid}`)
    for (const block of delegation.export()) {
      headers[`${HEADER_PREFIX}${block.cid}`] = UCAN.format(block.data)
    }
  }

  return {
    headers,
    body: UTF8.encode(JSON.stringify(body)),
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template {API.Invocation[]} Invocations
 * @param {API.HTTPRequest<Invocations>} request
 * @returns {Promise<Invocations>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers["content-type"] || headers["Content-Type"]
  if (contentType !== "application/json") {
    throw TypeError(
      `Only 'content-type: application/json' is supported, intsead got '${contentType}'`
    )
  }
  /** @type {API.Block[]} */
  const invocations = []
  const blocks = new Map()
  for (const [name, value] of Object.entries(headers)) {
    if (name.startsWith(HEADER_PREFIX)) {
      const key = name.slice(HEADER_PREFIX.length)
      const data = UCAN.parse(/** @type {UCAN.JWT<any>} */ (value))
      const { cid, bytes } = await UCAN.write(data)

      if (cid.toString() != key) {
        throw TypeError(
          `Invalid request, proof with key ${key} has mismatching cid ${cid}`
        )
      }
      blocks.set(cid.toString(), { data, cid, bytes })
    }
  }

  for (const cid of JSON.parse(UTF8.decode(body))) {
    const root = blocks.get(cid.toString())
    if (!root) {
      throw TypeError(
        `Invalid request proof of invocation ${cid} is not provided`
      )
    } else {
      invocations.push(Delegation.create({ root, blocks }))
      blocks.delete(cid.toString())
    }
  }

  return /** @type {Invocations} */ (invocations)
}

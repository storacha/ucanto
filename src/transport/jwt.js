import * as API from "../api.js"
import { pack, unpack } from "./packet.js"
import * as Transport from "./api.js"
import * as UCAN from "@ipld/dag-ucan"
import * as UTF8 from "../utf8.js"

const HEADER_PREFIX = "x-auth-"

const HEADERS = Object.freeze({
  "content-type": "application/json",
})

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template {API.IssuedInvocation[]} I
 * @param {API.Batch<I>} batch
 * @returns {Promise<Transport.HTTPRequest<I>>}
 */
export const encode = async batch => {
  /** @type {Record<string, string>} */
  const headers = {}
  /** @type {string[]} */
  const body = []
  const { invocations, delegations } = await pack(batch)
  for (const invocation of invocations) {
    headers[`${HEADER_PREFIX}${invocation.cid}`] = UCAN.format(invocation.data)
    body.push(`${invocation.cid}`)
  }
  for (const delegation of Object.values(delegations)) {
    headers[`${HEADER_PREFIX}${delegation.cid}`] = UCAN.format(delegation.data)
  }

  return {
    headers: HEADERS,
    body: UTF8.encode(JSON.stringify(body)),
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template {API.Invocation[]} Invocations
 * @param {Transport.HTTPRequest<Invocations>} request
 * @returns {Promise<API.Batch<Invocations>>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers["content-type"] || headers["Content-Type"]
  if (contentType !== "application/json") {
    throw TypeError(
      `Only 'content-type: application/json' is supported, intsead got '${contentType}'`
    )
  }
  /** @type {Transport.Block[]} */
  const invocations = []
  const delegations = new Map()
  for (const [name, value] of Object.entries(headers)) {
    if (name.startsWith(HEADER_PREFIX)) {
      const key = name.slice(HEADER_PREFIX.length)
      const data = UCAN.parse(value)
      const { cid, bytes } = await UCAN.write(data)

      if (cid.toString() != key) {
        throw TypeError(
          `Invalid request, proof with key ${key} has mismatching cid ${cid}`
        )
      }
      delegations.set(cid.toString(), { data, cid, bytes })
    }
  }

  for (const cid of JSON.parse(UTF8.decode(body))) {
    const block = delegations.get(cid.toString())
    if (!block) {
      throw TypeError(
        `Invalid request proof of invocation ${cid} is not provided`
      )
    }
    invocations.push(block)
    delegations.delete(block)
  }

  return unpack({ invocations, delegations })
}

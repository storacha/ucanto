import * as API from "../api.js"
import { pack, unpack } from "./packet.js"
import * as Transport from "./api.js"
import * as CAR from "../car.js"
import * as UCAN from "@ipld/dag-ucan"

const HEADERS = Object.freeze({
  "content-type": "application/car",
})

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template {API.IssuedInvocation[]} I
 * @param {API.Batch<I>} bundle
 * @returns {Promise<Transport.HTTPRequest<I>>}
 */
export const encode = async bundle => {
  const { invocations, delegations } = await pack(bundle)
  const body = CAR.encode({ roots: invocations, blocks: delegations.values() })

  return {
    headers: HEADERS,
    body,
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
  if (contentType !== "application/car") {
    throw TypeError(
      `Only 'content-type: application/car' is supported, intsead got '${contentType}'`
    )
  }

  const { roots, blocks } = await CAR.decode(body)
  const delegations = new Map()
  /** @type {Transport.Block[]} */
  const invocations = []

  for (const block of blocks) {
    delegations.set(block.cid.toString(), block)
  }

  for (const { cid, bytes } of roots) {
    invocations.push({
      cid: /** @type {UCAN.Proof<any, any>} */ (cid),
      bytes,
    })
  }

  return unpack({ invocations, delegations })
}

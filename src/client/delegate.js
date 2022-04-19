import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
import { isLink } from "../transport/packet.js"
import { Delegation } from "../view.js"

export * from "../api.js"

/**
 * Creates a new signed token with a given `options.issuer`. If expiration is
 * not set it defaults to 30 seconds from now. Returns UCAN in primary - IPLD
 * representation.
 *
 * @template {number} A
 * @template {UCAN.Capability} C
 * @param {API.DelegationOptions<C, A>} input
 * @param {{hasher?: UCAN.MultihashHasher<A>}} [options]
 * @returns {Promise<API.Delegation<C>>}
 */

export const delegate = async (
  { audience, proofs = [], ...input },
  options
) => {
  const links = []
  const blocks = new Map()
  for (const proof of proofs) {
    if (isLink(proof)) {
      links.push(proof)
    } else {
      for (const block of proof.export()) {
        blocks.set(block.cid.toString(), block)
      }

      links.push(proof.cid)
      blocks.set(proof.cid.toString(), { cid: proof.cid, bytes: proof.bytes })
    }
  }

  const data = await UCAN.issue({
    ...input,
    audience: audience.did(),
    proofs: links,
  })
  const { cid, bytes } = await UCAN.write(data, options)

  return new Delegation({ cid, bytes, data }, blocks)
}

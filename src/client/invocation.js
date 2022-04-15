import * as API from '../api.js'
import * as UCAN from '@ipld/dag-ucan'

/**
 * Encodes invocation into an IPLD DAG. Each proof is encoded as a separate
 * block. Generator returns CID of the invocation UCAN.
 *
 * @see https://github.com/multiformats/js-multiformats/issues/175
 * @template {UCAN.Capability} Capability
 * @param {API.Instruction<Capability>} options
 */
export const encoder = async function* ({
  issuer,
  audience,
  proofs = [],
  capabilities,
}) {
  const links = []
  for (const proof of proofs) {
    if (isLink(proof)) {
      links.push(proof)
    } else {
      const block = await UCAN.write(proof)
      links.push(block.cid)

      yield block
    }
  }

  const ucan = await UCAN.issue({
    issuer,
    audience,
    capabilities,
    proofs: links,
  })

  const block = await UCAN.write(ucan)

  yield block

  return block.cid
}

/**
 * Type predicate returns true if value is the link.
 *
 * @param {unknown} value
 * @returns {value is UCAN.Link}
 */

export const isLink = (value) =>
  value != null && /** @type {{asCID: unknown}} */ (value).asCID === value

import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
import { Invocation, Batch, Delegation } from "../view.js"

/**
 * Packs issued invocations into a set of UCAN invocation and delegation blocks.
 * Returns intermediary representation (IR) that can be encoded into a CAR file
 * or HTTP request wich bunch of JWT headers etc.
 *
 * @template {API.IssuedInvocation[]} Invocations
 * @param {API.Batch<Invocations>} batch
 * @param {API.EncodingOptions} [options]
 * @returns {Promise<API.Transport.Packet<Invocations>>}
 */
export const pack = async (batch, options) => {
  /** @type {API.Transport.Block[]} */
  const invocations = []
  const delegations = new Map()
  for (const invocation of batch.invocations) {
    const { links, blocks } = exportProofs(invocation.proofs || [])
    const { issuer, audience } = invocation

    for (const block of blocks) {
      delegations.set(block.cid.toString(), block)
    }

    const ucan = await UCAN.issue({
      issuer,
      audience,
      capabilities: [invocation.capability],
      proofs: links,
    })

    const { cid, bytes } = await UCAN.write(ucan, options)
    invocations.push({ cid, bytes, data: ucan })
  }

  return { invocations, delegations }
}

/**
 * Unpacks UCAN invocations and supplied proofs of delegations form IR to a
 * native
 *
 * @template {API.Invocation[]} Invocations
 * @param {API.Transport.Packet<Invocations>} bundle
 * @returns {API.Batch<Invocations>}
 */
export const unpack = bundle => {
  /** @type {Invocations} */
  const invocations = /** @type {any} */ ([])

  for (const block of bundle.invocations) {
    const invocation = new Invocation(block, bundle.delegations)
    invocations.push(invocation)
  }

  return new Batch(invocations)
}

/**
 * @param {API.Proof[]} proofs
 * @returns {{ blocks: API.Transport.Block[], links: UCAN.Proof[] }}
 */
const exportProofs = proofs => {
  const links = []
  const blocks = []
  for (const proof of proofs) {
    if (isLink(proof)) {
      links.push(proof)
    } else {
      links.push(proof.cid)
      for (const block of exportDelegation(proof)) {
        blocks.push(block)
      }
    }
  }
  return { links, blocks }
}

/**
 * @template {UCAN.Capability} C
 * @param {API.Delegation<C>} delegation
 * @returns {IterableIterator<API.Transport.Block<C>>}
 */
export const exportDelegation = function* ({ cid, bytes, data, proofs = [] }) {
  for (const proof of proofs) {
    if (!isLink(proof)) {
      yield* exportDelegation(proof)
    }
  }
  yield { cid, bytes, data }
}

/**
 * @template {UCAN.Capability} C
 * @param {IterableIterator<API.Transport.Block<C> & { data?: UCAN.UCAN<C> }>} dag
 * @returns {API.Delegation<C>}
 */
export const importDelegation = dag => {
  /** @type {Array<[string, API.Transport.Block<C>]>} */
  let entries = []
  for (const block of dag) {
    entries.push([block.cid.toString(), block])
  }

  const last = entries.pop()
  if (!last) {
    throw new Error("Empty DAG can not be turned into a dalagetion")
  } else {
    const [, root] = last

    return new Delegation(root, new Map(entries))
  }
}

/**
 * Type predicate returns true if value is the link.
 *
 * @param {unknown} value
 * @returns {value is UCAN.Link}
 */

export const isLink = value =>
  value != null && /** @type {{asCID: unknown}} */ (value).asCID === value

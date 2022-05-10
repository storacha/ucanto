import * as API from "@ucanto/interface"
import * as UCAN from "@ipld/dag-ucan"
import { Delegation, isLink, exportDelegation } from "@ucanto/core"

/**
 * Packs issued invocations into a set of UCAN invocation and delegation blocks.
 * Returns intermediary representation (IR) that can be encoded into a CAR file
 * or HTTP request wich bunch of JWT headers etc.
 *
 * @template {API.IssuedInvocation[]} Invocations
 * @param {API.Batch<Invocations>} batch
 * @param {API.Transport.EncodeOptions} [options]
 * @returns {Promise<API.Packet<Invocations>>}
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
 * @param {API.Packet<Invocations>} bundle
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
 * @returns {{ blocks: API.Block[], links: UCAN.Proof[] }}
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
 * @param {IterableIterator<API.Block<C> & { data?: UCAN.UCAN<C> }>} dag
 * @returns {API.Delegation<C>}
 */
const importDelegation = dag => {
  /** @type {Array<[string, API.Block<C>]>} */
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
 * @template {API.IssuedInvocation[]|API.Invocation[]} Invocations
 * @implements {API.Batch<Invocations>}
 */
export class Batch {
  /**
   * @param {Invocations} invocations
   * @param {Map<string, API.UCAN.View>} [delegations]
   */
  constructor(invocations, delegations = new Map()) {
    this.invocations = invocations
    this.delegations = delegations
  }
}

/**
 * Represents invocation view of the UCAN DAG.
 *
 * @template {API.Capability} Capability
 * @implements {API.InvocationView<Capability>}
 * @extends {Delegation<Capability>}
 */
export class Invocation extends Delegation {
  get capability() {
    return /** @type {Capability} */ (this.capabilities[0])
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.Connection<Service>} connection
   * @returns {API.ExecuteInvocation<Capability, Service>}
   */
  execute(connection) {
    throw new Error("Not implemented")
  }
}

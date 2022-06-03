import * as UCAN from "@ipld/dag-ucan"
import * as API from "@ucanto/interface"

/**
 * Represents UCAN chain view over the set of DAG UCAN nodes. You can think of
 * this as UCAN interface of the CAR.
 *
 * @template {UCAN.Capability} Capability
 * @implements {API.Delegation<Capability>}
 * @extends {DelegationView<Capability>}
 */
export class Delegation {
  /**
   * @param {object} root
   * @param {UCAN.Proof<Capability>} root.cid
   * @param {UCAN.ByteView<UCAN.UCAN<Capability>>} root.bytes
   * @param {UCAN.View<Capability>} root.data
   * @param {Map<string, API.Block>} [blocks]
   */
  constructor(root, blocks = new Map()) {
    this.root = root
    this.blocks = blocks

    Object.defineProperties(this, {
      blocks: {
        enumerable: false,
      },
    })
  }

  get version() {
    return this.root.data.version
  }
  get signature() {
    return this.root.data.signature
  }
  get cid() {
    return this.root.cid
  }
  get asCID() {
    return this.cid
  }
  get bytes() {
    return this.root.bytes
  }
  get data() {
    return this.root.data
  }
  /**
   * @returns {IterableIterator<API.Block>}
   */
  export() {
    return exportDAG(this.root, this.blocks)
  }

  /**
   * @type {API.Proof[]}
   */
  get proofs() {
    return proofs(this)
  }

  /**
   * @type {API.Identity}
   */
  get issuer() {
    return this.data.issuer
  }

  /**
   * @type {API.Identity}
   */
  get audience() {
    return this.data.audience
  }

  /**
   * @returns {Capability[]}
   */
  get capabilities() {
    return this.data.capabilities
  }

  /**
   * @returns {number}
   */
  get expiration() {
    return this.data.expiration
  }

  /**
   * @returns {undefined|number}
   */
  get notBefore() {
    return this.data.notBefore
  }

  /**
   * @returns {undefined|string}
   */

  get nonce() {
    return this.data.nonce
  }

  /**
   * @returns {UCAN.Fact[]}
   */
  get facts() {
    return this.data.facts
  }
}

/**
 * Type predicate returns true if value is the link.
 *
 * @param {unknown} value
 * @returns {value is UCAN.Proof}
 */
export const isLink = value =>
  value != null && /** @type {{asCID: unknown}} */ (value).asCID === value

/**
 * Creates a new signed token with a given `options.issuer`. If expiration is
 * not set it defaults to 30 seconds from now. Returns UCAN in primary - IPLD
 * representation.
 *
 * @template {number} A
 * @template {UCAN.Capability} C
 * @param {API.DelegationOptions<C, A>} input
 * @returns {Promise<API.Delegation<C>>}
 */

export const delegate = async ({ issuer, audience, proofs = [], ...input }) => {
  const links = []
  const blocks = new Map()
  for (const proof of proofs) {
    if (isLink(proof)) {
      links.push(proof)
    } else {
      proof
      links.push(proof.cid)
      for (const block of proof.export()) {
        blocks.set(block.cid.toString(), block)
      }
    }
  }

  const data = await UCAN.issue({
    ...input,
    issuer,
    audience,
    proofs: links,
  })
  const { cid, bytes } = await UCAN.write(data)

  const delegation = new Delegation({ cid, bytes, data }, blocks)
  Object.defineProperties(delegation, { proofs: { value: proofs } })

  return delegation
}

/**
 * @template {UCAN.Capability} C
 * @param {API.Block<C>} root
 * @param {Map<string, API.Block>} blocks
 * @returns {IterableIterator<API.Block>}
 */

const exportDAG = function* (root, blocks) {
  for (const link of root.data.proofs) {
    // Check if block is included in this delegation
    const root = blocks.get(link.toString())
    if (root) {
      yield* exportDAG(root, blocks)
    }
  }

  yield root
}

/**
 * @template {UCAN.Capability} C
 * @param {Iterable<API.Block & { data?: UCAN.UCAN }>} dag
 * @returns {API.Delegation<C>}
 */
export const importDAG = dag => {
  /** @type {Array<[string, API.Block]>} */
  let entries = []
  for (const block of dag) {
    entries.push([block.cid.toString(), block])
  }

  const last = entries.pop()
  if (!last) {
    throw new RangeError("Empty DAG can not be turned into a dalagetion")
  } else {
    const [, root] = last

    return new Delegation(/** @type {API.Block<C>} */ (root), new Map(entries))
  }
}

/**
 * @template {UCAN.Capability} Capability
 * @param {object} dag
 * @param {object} dag.root
 * @param {UCAN.Proof<Capability>} dag.root.cid
 * @param {UCAN.ByteView<UCAN.UCAN<Capability>>} dag.root.bytes
 * @param {UCAN.View<Capability>} dag.root.data
 * @param {Map<string, API.Block>} [dag.blocks]
 * @returns {API.Delegation<Capability>}
 */
export const create = ({ root, blocks }) => new Delegation(root, blocks)

/**
 * @param {API.Delegation} delegation
 */
const proofs = delegation => {
  /** @type {API.Proof[]} */
  const proofs = []
  const { root, blocks } = delegation
  // Iterate over proof links and materialize Delegation views.
  for (const link of root.data.proofs) {
    // Check if linked proof is included in our blocks if so create delegation
    // view otherwise use a link
    const root = blocks.get(link.toString())
    proofs.push(root ? create({ root, blocks }) : link)
  }

  // we cache result of this computation as this property may get accessed
  // more than once.
  Object.defineProperty(delegation, "proofs", { value: proofs })
  return proofs
}

export { exportDAG as export, importDAG as import }

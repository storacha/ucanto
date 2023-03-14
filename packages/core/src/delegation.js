import * as UCAN from '@ipld/dag-ucan'
import * as API from '@ucanto/interface'
import * as Link from './link.js'

/**
 * @deprecated
 * Import `isLink` from module directly
 */
export const isLink =
  /** @type {(value:API.Proof) => value is API.UCANLink} */
  (Link.isLink)

/**
 *
 * @param {API.Proof} proof
 * @return {proof is API.Delegation}
 */
export const isDelegation = proof => !Link.isLink(proof)

/**
 * Takes one or more delegations and returns all delegated capabilities in
 * UCAN 0.10 format, expanding all the special forms like `with: ucan:*` and
 * `can: *` to explicit forms.
 *
 * Note that this function only considers included proofs and ignores linked
 * proofs. It is up to the user of this function to resolve whatever proofs it
 * needs and build delegation with them before calling this function.
 *
 * Also note that this function does not validate the delegations and may
 * produce result containing capabilities that escalate, which for the validator
 * perspective is no different from not including such capabilities.
 *
 * @template {[API.Delegation, ...API.Delegation[]]} T
 * @param {T} delegations
 * @returns {API.InferAllowedFromDelegations<T>}
 */
export const allows = (...delegations) => {
  /** @type {API.Allows} */
  let allow = {}
  for (const delegation of delegations) {
    for (const capability of delegation.capabilities) {
      // If uri is `ucan:*` then we include own capabilities along with
      // delegated
      const capabilities =
        capability.with === 'ucan:*'
          ? iterateCapabilities(delegation)
          : [capability]

      for (const { with: uri, can, nb } of capabilities) {
        const resource = allow[uri] || (allow[uri] = {})
        const abilities = resource[can] || (resource[can] = [])
        // We call `Object(nb)` because according to the types `nb` is unknown
        // even though at other layers we enforce it to be an object. This way
        // we make TS happy and also handle cases where `nb` isn't an object
        // e.g. because it was decoded from malformed block.
        abilities.push({ ...Object(nb) })
      }
    }
  }

  return /** @type {API.InferAllowedFromDelegations<T>} */ (allow)
}

/**
 * Function takes a delegation and iterates over all the capabilities expanding
 * all the special forms like `with: ucan:*` and `can: *`.
 *
 * Note that this function only considers proofs that are included in the
 * delegation, linked proofs will not be resolved nor considered. It is up to
 * the user of this function to resolve whatever proofs it needs to consider
 * before calling this function.
 *
 * @param {API.Delegation} delegation
 * @returns {Iterable<API.Capability>}
 */
const iterateCapabilities = function* ({ issuer, capabilities, proofs }) {
  for (const { with: uri, can, nb } of capabilities) {
    // If `with` field is set to  `ucan:*` it implies re-delegation of all own
    // and delegated capabilities.
    if (uri === 'ucan:*') {
      // Here we yield own capabilities (which are not delegated). Also note
      // that we can not expand `can: *` because it is impossible to list out
      // all the capabilities that can exist.
      yield {
        with: issuer.did(),
        can,
        nb,
      }

      // Here we yield delegated capabilities. If `can` is set to `*` then we
      // expand it to the `can` of the delegated capabilities so it is clear
      // what capabilities are being delegated. Also note that we do not
      // consider `with: "ucan:*"` here because this is recursive walk which
      // would have expanded it already.
      for (const proof of proofs) {
        // We only consider delegation proofs that are included as opposed to
        // linked because we have no way of resolving them.
        if (isDelegation(proof)) {
          for (const capability of iterateCapabilities(proof)) {
            yield {
              with: capability.with,
              can: can === '*' ? capability.can : can,
              // We do not know semantics of this capability so it is impossible
              // to do an accurate merge. Which is why we do a naive merge
              // ensuring that all `nb` fields are present. As a result we may
              // include a capability that escalates some constraints imposed
              // by the delegated capability, which is not ideal but something
              // that validator will reject which will behave same as if we have
              // not included this capability in first place.
              nb: { ...capability.nb, ...Object(nb) },
            }
          }
        }
      }
    } else {
      yield { with: uri, can, nb }
    }
  }
}

/**
 * Represents UCAN chain view over the set of DAG UCAN nodes. You can think of
 * this as UCAN interface of the CAR.
 *
 * @template {API.Capabilities} C
 * @implements {API.Delegation<C>}
 * @extends {DelegationView<C>}
 */
export class Delegation {
  /**
   * @param {API.UCANBlock<C>} root
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
    return this.data.version
  }
  get signature() {
    return this.data.signature
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
    const data = decode(this.root)
    Object.defineProperties(this, { data: { value: data, enumerable: false } })
    return data
  }
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
   * @type {API.Principal}
   */
  get issuer() {
    return this.data.issuer
  }

  /**
   * @type {API.Principal}
   */
  get audience() {
    return this.data.audience
  }

  /**
   * @returns {C}
   */
  get capabilities() {
    return /** @type {C} */ (this.data.capabilities)
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
   * @returns {API.Fact[]}
   */
  get facts() {
    return this.data.facts
  }

  /**
   * Iterate over the proofs
   *
   * @returns {IterableIterator<API.Delegation>}
   */
  iterate() {
    return it(this)
  }

  delegate() {
    return this
  }

  /**
   * @returns {API.DelegationJSON<this>}
   */
  toJSON() {
    return /** @type {any} */ ({
      ...this.data.toJSON(),
      '/': this.cid.toString(),
      prf: this.proofs.map(proof =>
        isDelegation(proof) ? proof : { '/': proof.toString() }
      ),
    })
  }
}

/**
 * @param {API.Delegation} delegation
 * @returns {IterableIterator<API.Delegation>}
 */
const it = function* (delegation) {
  for (const proof of delegation.proofs) {
    if (isDelegation(proof)) {
      yield* it(proof)
      yield proof
    }
  }
}

const decodeCache = new WeakMap()
/**
 * @template {API.Capabilities} C
 * @param {API.UCANBlock<C>} block
 * @returns {UCAN.View<C>}
 */
const decode = ({ bytes }) => {
  const data = decodeCache.get(bytes)
  if (!data) {
    const data = UCAN.decode(bytes)
    decodeCache.set(bytes, data)
    return data
  }
  return data
}

/**
 * Creates a new signed token with a given `options.issuer`. If expiration is
 * not set it defaults to 30 seconds from now. Returns UCAN in primary - IPLD
 * representation.
 *
 * @template {API.Capabilities} C
 * @param {API.DelegationOptions<C>} data
 * @param {API.EncodeOptions} [options]
 * @returns {Promise<API.Delegation<C>>}
 */

export const delegate = async (
  { issuer, audience, proofs = [], ...input },
  options
) => {
  const links = []
  const blocks = new Map()
  for (const proof of proofs) {
    if (!isDelegation(proof)) {
      links.push(proof)
    } else {
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
  const { cid, bytes } = await UCAN.write(data, options)
  decodeCache.set(cid, data)

  /** @type {API.Delegation<C>} */
  const delegation = new Delegation({ cid, bytes }, blocks)
  Object.defineProperties(delegation, { proofs: { value: proofs } })

  return delegation
}

/**
 * @template {API.Capabilities} C
 * @param {API.UCANBlock<C>} root
 * @param {Map<string, API.Block>} blocks
 * @returns {IterableIterator<API.Block>}
 */

export const exportDAG = function* (root, blocks) {
  for (const link of decode(root).proofs) {
    // Check if block is included in this delegation
    const root = /** @type {UCAN.Block} */ (blocks.get(link.toString()))
    if (root) {
      yield* exportDAG(root, blocks)
    }
  }

  yield root
}

/**
 * @template {API.Capabilities} C
 * @param {Iterable<API.Block>} dag
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
    throw new RangeError('Empty DAG can not be turned into a delegation')
  } else {
    const [, root] = last

    return new Delegation(
      /** @type {API.UCANBlock<C>} */ (root),
      new Map(entries)
    )
  }
}

/**
 * @template {API.Capabilities} C
 * @param {object} dag
 * @param {API.UCANBlock<C>} dag.root
 * @param {Map<string, API.Block<unknown>>} [dag.blocks]
 * @returns {API.Delegation<C>}
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
  for (const link of decode(root).proofs) {
    // Check if linked proof is included in our blocks if so create delegation
    // view otherwise use a link
    const root = /** @type {UCAN.Block} */ (blocks.get(link.toString()))
    proofs.push(root ? create({ root, blocks }) : link)
  }

  // we cache result of this computation as this property may get accessed
  // more than once.
  Object.defineProperty(delegation, 'proofs', { value: proofs })
  return proofs
}

export { Delegation as View }

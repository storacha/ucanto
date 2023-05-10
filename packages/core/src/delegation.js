import * as UCAN from '@ipld/dag-ucan'
import * as API from '@ucanto/interface'
import * as Link from './link.js'
import * as DAG from './dag.js'
import * as CAR from './car.js'
import * as CBOR from './cbor.js'
import * as Schema from './schema.js'
import { ok, error } from './result.js'

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
    for (const { with: uri, can, nb } of iterateCapabilities(delegation)) {
      const resource = allow[uri] || (allow[uri] = {})
      const abilities = resource[can] || (resource[can] = [])
      abilities.push({ ...nb })
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
  for (const own of capabilities) {
    // If `with` field is set to  `ucan:*` it implies re-delegation of all own
    // and delegated capabilities.
    if (own.with === 'ucan:*') {
      // Fist we include own capabilities. Note that we can not expand `can`
      // because it implicitly covers all possible options in the universe.
      yield {
        ...own,
        with: issuer.did(),
      }

      // Next we iterate over all delegated capabilities including ones that
      // match ability in the `own.can` field.
      for (const proof of proofs) {
        // We only consider proofs that are included and ignore linked proofs.
        if (isDelegation(proof)) {
          for (const capability of iterateCapabilities(proof)) {
            // We attempt to match `capability.can` against `own.can` field
            // if there is a match we include the capability otherwise we skip
            const can = matchAbility(capability.can, own.can)
            if (can) {
              yield {
                ...capability,
                can,
                // We do not know capability semantics so it is impossible
                // for us to eliminate capabilities that do not satisfy imposed
                // caveats (`own.nb`). Therefore we optimistically assume that
                // `own.nb` further constraints `capability.nb` and do a shallow
                // merge of the two. As a result we may include capabilities
                // that during validation will be considered invalid due to
                // constraint violations. While that is not ideal validator
                // will treat them as if they were omitted and therefore it
                // is a reasonable compromise.
                nb: { ...capability.nb, ...Object(own.nb) },
              }
            }
          }
        }
      }
    } else {
      yield own
    }
  }
}

/**
 * Function takes `can` field from the delegated capability and attempts to
 * match it against `can` field of the claimed capability. If there is a match
 * the function returns more specific `can` field of two, otherwise it returns
 * `null`.
 *
 * @param {API.Ability} provided
 * @param {API.Ability} claimed
 */
const matchAbility = (provided, claimed) => {
  // If provided capability delegates all abilities we can derive any `can`
  // from it so we return `claimed` as is.
  if (provided === '*') {
    return claimed
  }
  // If claimed capability delegates all abilities that includes any `can`
  // so we return `provided` as is.
  if (claimed === '*') {
    return provided
  }
  // If claimed `can` is a pattern that includes `provided` `can` we return
  // `provided` as is.
  if (claimed.endsWith('/*') && provided.startsWith(claimed.slice(0, -1))) {
    return provided
  }
  // If provided `can` is a pattern that includes `claimed` `can` we can derive
  // `claimed` from it so we return `claimed` as is.
  if (provided.endsWith('/*') && claimed.startsWith(provided.slice(0, -1))) {
    return claimed
  }
  // If `can` fields are concrete and the same we have a match and can return it.
  if (provided === claimed) {
    return provided
  }
  // otherwise two are incompatible and we return null.
  return null
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
   * @param {DAG.BlockStore} [blocks]
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

  /**
   * @returns {API.AttachedLinkSet}
   */
  get attachedLinks() {
    const _attachedLinks = new Set()
    const ucanView = this.data

    // Get links from capabilities nb
    for (const capability of ucanView.capabilities) {
      /** @type {Link[]} */
      const links = getLinksFromObject(capability)

      for (const link of links) {
        _attachedLinks.add(`${link}`)
      }
    }

    // Get links from facts values
    for (const fact of ucanView.facts) {
      if (Link.isLink(fact)) {
        _attachedLinks.add(`${fact}`)
      } else {
        /** @type {Link[]} */
        // @ts-expect-error isLink does not infer value type
        const links = Object.values(fact).filter(e => Link.isLink(e))

        for (const link of links) {
          _attachedLinks.add(`${link}`)
        }
      }
    }

    return _attachedLinks
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
  link() {
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
  /**
   * Attach a block to the delegation DAG so it would be included in the
   * block iterator.
   * ⚠️ You can only attach blocks that are referenced from the `capabilities`
   * or `facts`.
   *
   * @param {API.Block} block
   */
  attach(block) {
    if (!this.attachedLinks.has(`${block.cid.link()}`)) {
      throw new Error(`given block with ${block.cid} is not an attached link`)
    }
    this.blocks.set(`${block.cid}`, block)
  }
  export() {
    return exportDAG(this.root, this.blocks, this.attachedLinks)
  }

  /**
   * @returns {API.Await<API.Result<Uint8Array, Error>>}
   */
  archive() {
    return archive(this)
  }

  iterateIPLDBlocks() {
    return exportDAG(this.root, this.blocks, this.attachedLinks)
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

  buildIPLDView() {
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
 * Writes given `Delegation` chain into a content addressed archive (CAR)
 * buffer and returns it.
 *
 * @param {API.Delegation} delegation}
 * @returns {Promise<API.Result<Uint8Array, Error>>}
 */
export const archive = async delegation => {
  try {
    // Iterate over all of the blocks in the DAG and add them to the
    // block store.
    const store = new Map()
    for (const block of delegation.iterateIPLDBlocks()) {
      store.set(`${block.cid}`, block)
    }

    // Then we we create a descriptor block to describe what this DAG represents
    // and it to the block store as well.
    const variant = await CBOR.write({
      [`ucan@${delegation.version}`]: delegation.root.cid,
    })
    store.set(`${variant.cid}`, variant)

    // And finally we encode the whole thing into a CAR.
    const bytes = CAR.encode({
      roots: [variant],
      blocks: store,
    })

    return ok(bytes)
  } catch (cause) {
    return error(/** @type {Error} */ (cause))
  }
}

export const ArchiveSchema = Schema.variant({
  'ucan@0.9.1': /** @type {Schema.Schema<API.UCANLink>} */ (
    Schema.link({ version: 1 })
  ),
})

/**
 * Extracts a `Delegation` chain from a given content addressed archive (CAR)
 * buffer. Assumes that the CAR contains a single root block corresponding to
 * the delegation variant.
 *
 * @param {Uint8Array} archive
 */
export const extract = async archive => {
  try {
    const { roots, blocks } = CAR.decode(archive)
    const [root] = roots
    if (root == null) {
      return Schema.error('CAR archive does not contain a root block')
    }
    const { bytes } = root
    const variant = CBOR.decode(bytes)
    const [, link] = ArchiveSchema.match(variant)
    return ok(view({ root: link, blocks }))
  } catch (cause) {
    return error(/** @type {Error} */ (cause))
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
  { issuer, audience, proofs = [], attachedBlocks = new Map(), ...input },
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

  for (const block of attachedBlocks.values()) {
    delegation.attach(block)
  }

  return delegation
}

/**
 * @template {API.Capabilities} C
 * @param {API.UCANBlock<C>} root
 * @param {DAG.BlockStore} blocks
 * @param {API.AttachedLinkSet} attachedLinks
 * @returns {IterableIterator<API.Block>}
 */

export const exportDAG = function* (root, blocks, attachedLinks) {
  for (const link of decode(root).proofs) {
    // Check if block is included in this delegation
    const root = /** @type {UCAN.Block} */ (blocks.get(`${link}`))
    if (root) {
      yield* exportSubDAG(root, blocks)
    }
  }

  for (const link of attachedLinks.values()) {
    const block = blocks.get(link)

    if (block) {
      // @ts-expect-error can get blocks with v0 and v1
      yield block
    }
  }

  yield root
}

/**
 * @template {API.Capabilities} C
 * @param {API.UCANBlock<C>} root
 * @param {DAG.BlockStore} blocks
 * @returns {IterableIterator<API.Block>}
 */
const exportSubDAG = function* (root, blocks) {
  for (const link of decode(root).proofs) {
    // Check if block is included in this delegation
    const root = /** @type {UCAN.Block} */ (blocks.get(`${link}`))
    if (root) {
      yield* exportSubDAG(root, blocks)
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
 * @param {DAG.BlockStore} [dag.blocks]
 * @returns {API.Delegation<C>}
 */
export const create = ({ root, blocks }) => new Delegation(root, blocks)

/**
 * @template {API.Capabilities} C
 * @template [E=never]
 * @param {object} dag
 * @param {API.UCANLink<C>} dag.root
 * @param {DAG.BlockStore} dag.blocks
 * @param {E} [fallback]
 * @returns {API.Delegation<C>|E}
 */
export const view = ({ root, blocks }, fallback) => {
  const block = DAG.get(root, blocks, null)
  if (block == null) {
    return fallback !== undefined ? fallback : DAG.notFound(root)
  }
  return create({ root: block, blocks })
}

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

/**
 * @param {API.Capability<API.Ability, `${string}:${string}`, unknown>} obj
 */
function getLinksFromObject(obj) {
  /** @type {Link[]} */
  const links = []

  /**
   * @param {object} obj
   */
  function recurse(obj) {
    for (const key in obj) {
      // @ts-expect-error record type not inferred
      const value = obj[key]
      if (Link.isLink(value)) {
        // @ts-expect-error isLink does not infer value type
        links.push(value)
      } else if (value && typeof value === 'object') {
        recurse(value)
      }
    }
  }

  recurse(obj)

  return links
}

export { Delegation as View }

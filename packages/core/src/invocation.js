import * as API from '@ucanto/interface'
import { delegate, Delegation, isDelegation } from './delegation.js'
import * as DAG from './dag.js'

/**
 * Takes invocation link or a reference and returns `true` if value
 * passed is a reference, returns `false` if value is a link.
 *
 * @param {API.Invocation | API.Link} value
 * @return {value is API.Invocation}
 */
export const isInvocation = value => isDelegation(value)

/**
 * @template {API.Capability} Capability
 * @param {API.InvocationOptions<Capability>} options
 * @return {API.IssuedInvocationView<Capability>}
 */
export const invoke = options => new IssuedInvocation(options)

/**
 * @template {API.Capability} C
 * @param {object} dag
 * @param {API.UCANBlock<[C]>} dag.root
 * @param {DAG.BlockStore} [dag.blocks]
 * @returns {API.Invocation<C>}
 */
export const create = ({ root, blocks }) => new Invocation(root, blocks)

/**
 * Takes a link of the `root` block and a map of blocks and constructs an
 * `Invocation` from it. If `root` is not included in the provided blocks
 * provided fallback is returned and if not provided than throws an error.
 * If root points to wrong block (that is not an invocation) it will misbehave
 * and likely throw some errors on field access.
 *
 * @template {API.Capability} C
 * @template {API.Invocation} Invocation
 * @template [T=never]
 * @param {object} dag
 * @param {API.UCANLink<[C]>} dag.root
 * @param {DAG.BlockStore} dag.blocks
 * @param {T} [fallback]
 * @returns {API.Invocation<C>|T}
 */
export const view = ({ root, blocks }, fallback) => {
  const block = DAG.get(root, blocks, null)
  if (block == null) {
    return fallback !== undefined ? fallback : DAG.notFound(root)
  }

  return /** @type {API.Invocation<C>} */ (create({ root: block, blocks }))
}

/**
 * @template {API.Capability} Capability
 * @implements {API.IssuedInvocationView<Capability>}
 * @implements {API.IssuedInvocation<Capability>}
 */
class IssuedInvocation {
  /**
   * @param {API.InvocationOptions<Capability>} data
   */
  constructor({
    issuer,
    audience,
    capability,
    proofs = [],
    expiration,
    lifetimeInSeconds,
    notBefore,
    nonce,
    facts = [],
  }) {
    /** @readonly */
    this.issuer = issuer
    /** @readonly */
    this.audience = audience
    /** @readonly */
    this.proofs = proofs

    /**
     * @readonly
     * @type {[Capability]}
     */
    this.capabilities = [capability]

    this.expiration = expiration
    this.lifetimeInSeconds = lifetimeInSeconds
    this.notBefore = notBefore
    this.nonce = nonce
    this.facts = facts

    /** @type {API.BlockStore<unknown>} */
    this.attachedBlocks = new Map()
  }

  /**
   * @param {API.Block} block
   */
  attach(block) {
    this.attachedBlocks.set(`${block.cid}`, block)
  }

  delegate() {
    return delegate(this)
  }

  buildIPLDView() {
    return delegate(this)
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.ConnectionView<Service>} connection
   * @returns {Promise<API.InferReceipt<Capability, Service>>}
   */
  async execute(connection) {
    /** @type {API.ServiceInvocation<Capability, Service>} */
    // @ts-expect-error - Our `API.InvocationService<Capability>` constraint
    // does not seem to be enough to convince TS that `this` is valid
    // `ServiceInvocations<Service>`.
    const invocation = this
    const [result] = await connection.execute(invocation)
    return result
  }
}

/**
 * @template {API.Capability} Capability
 * @implements {API.Invocation<Capability>}
 * @extends {Delegation<[Capability]>}
 */
export class Invocation extends Delegation {}

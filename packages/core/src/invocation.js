import * as API from '@ucanto/interface'
import { delegate } from './delegation.js'

/**
 * @template {API.Capability} Capability
 * @param {API.InvocationOptions<Capability>} options
 * @return {API.IssuedInvocationView<Capability>}
 */
export const invoke = options => new IssuedInvocation(options)

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
     */
    this.capabilities =
      /** @type {[Required<Capability>]} */
      ([
        {
          nb: {},
          ...capability,
        },
      ])

    this.expiration = expiration
    this.lifetimeInSeconds = lifetimeInSeconds
    this.notBefore = notBefore
    this.nonce = nonce
    this.facts = facts
  }

  delegate() {
    return delegate(this)
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.ConnectionView<Service>} connection
   * @returns {Promise<API.InferServiceInvocationReturn<Capability, Service>>}
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

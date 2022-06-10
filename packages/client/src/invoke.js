import * as API from "@ucanto/interface"
import { execute } from "./connection.js"

/**
 * @template {API.Capability} Capability
 * @param {API.InvocationOptions<Capability>} invocation
 * @return {API.IssuedInvocationView<Capability>}
 */
export const invoke = ({ issuer, audience, proofs, capability }) =>
  new IssuedInvocation({
    issuer,
    audience,
    capabilities: [capability],
    proofs,
  })

/**
 * @template {API.Capability} Capability
 * @implements {API.IssuedInvocationView<Capability>}
 * @implements {API.IssuedInvocation<Capability>}
 */
class IssuedInvocation {
  /**
   * @param {object} data
   * @param {API.SigningAuthority} data.issuer
   * @param {API.Identity} data.audience
   * @param {[Capability]} data.capabilities
   * @param {API.Proof[]} [data.proofs]
   */
  constructor({ issuer, audience, capabilities, proofs = [] }) {
    /** @readonly */
    this.issuer = issuer
    /** @readonly */
    this.audience = audience
    /** @readonly */
    this.proofs = proofs

    /** @readonly */
    this.capabilities = capabilities
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.Connection<Service>} connection
   * @returns {Promise<API.InferServiceInvocationReturn<Capability, Service>>}
   */
  async execute(connection) {
    /** @type {API.ServiceInvocation<Capability, Service>} */
    // @ts-expect-error - Our `API.InvocationService<Capability>` constraint
    // does not seem to be enough to convince TS that `this` is valid
    // `ServiceInvocations<Service>`.
    const invocation = this
    const [result] = await execute([invocation], connection)
    return result
  }
}

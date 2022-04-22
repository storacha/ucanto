import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
import { IssuedInvocation } from "../view.js"
export * from "../api.js"

/**
 * @template {UCAN.Capability} Capability
 * @param {API.IssuedInvocation<Capability>} invocation
 * @return {API.IssuedInvocationView<Capability>}
 */
export const invoke = ({ issuer, audience, proofs, capability }) =>
  new IssuedInvocation({
    issuer,
    audience,
    capability,
    proofs,
  })

/**
 * @template {API.IssuedInvocation[]} Invocations
 * @param {Invocations} invocations
 * @returns {API.Batch<Invocations>}
 */

export const batch = (...invocations) => new Batch(invocations)

/**
 * @template {API.IssuedInvocation[]} Invocations
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

  /**
   * @template {API.BatchInvocationService<Invocations>} Service
   * @param {API.Connection<Service>} connection
   * @returns {Promise<API.ExecuteBatchInvocation<Invocations, Service>>}
   */
  async execute(connection) {
    const request = await connection.encoder.encode(this, connection)
    const response = await connection.channel.request(request)
    const result = await connection.decoder.decode(response)
    return result
  }
}

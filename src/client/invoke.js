import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
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
 * @returns {API.BatchView<Invocations>}
 */

export const batch = (...invocations) => new Batch(invocations)

/**
 * @template {API.IssuedInvocation[]} Invocations
 * @implements {API.BatchView<Invocations>}
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
   * @template Service
   * @param {API.Connection<Service>} connection
   * @returns {Promise<API.ExecuteBatchInvocation<Invocations, Service>>}
   */
  async execute(connection) {
    return execute(/** @type {API.Batch<any[]>} */ (this), connection)
  }
}

/**
 * @template {API.Capability} Capability
 * @implements {API.IssuedInvocationView<Capability>}
 * @implements {API.IssuedInvocation<Capability>}
 */
export class IssuedInvocation {
  /**
   * @param {object} data
   * @param {API.Issuer} data.issuer
   * @param {API.Agent} data.audience
   * @param {Capability} data.capability
   * @param {API.Proof[]} [data.proofs]
   */
  constructor({ issuer, audience, capability, proofs = [] }) {
    /** @readonly */
    this.issuer = issuer
    /** @readonly */
    this.audience = audience
    /** @readonly */
    this.proofs = proofs

    /** @readonly */
    this.capability = capability
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.Connection<Service>} connection
   * @returns {Promise<API.ExecuteInvocation<Capability, Service>>}
   */
  async execute(connection) {
    const [result] = await batch(this).execute(connection)
    return /** @type {API.ExecuteInvocation<Capability, Service>} */ (result)
  }
}

/**
 * @template T
 * @template {API.ServiceInvocations<T>[] & API.IssuedInvocation[]} I
 * @param {API.Batch<I>} batch
 * @param {API.Connection<T>} connection
 */
export const execute = async (batch, connection) => {
  const request = await connection.encoder.encode(batch, connection)
  const response = await connection.channel.request(request)
  const result = await connection.decoder.decode(response)
  return result
}

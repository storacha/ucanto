import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
import { IssuedInvocation, Batch } from "../view.js"
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

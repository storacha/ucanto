import { invoke } from "@ucanto/client"
import * as API from "../type.js"
import * as Capability from "./capability.js"

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Identity.MailtoID} options.id
 * @param {API.Proof<[API.Identity.Register]>} [options.proof]
 * @param {API.DID} [options.as]
 * @return {API.IssuedInvocationView<API.Identity.Register>}
 */
export const register = ({ issuer, audience, proof, id, as = issuer.did() }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "identity/register",
      with: id,
      as,
    },
    proofs: proof ? [proof] : [],
  })

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Identity.MailtoID} options.as
 * @param {API.DID} [options.id]
 * @param {API.Proof<[API.Identity.Validate]>} [options.proof]
 * @return {API.IssuedInvocationView<API.Identity.Validate>}
 */
export const validate = ({ issuer, audience, as, id = issuer.did(), proof }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "identity/validate",
      with: id,
      as,
    },
    proofs: proof ? [proof] : [],
  })

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Identity.ID} options.id
 * @param {API.Proof<[API.Identity.Link]>} [options.proof]
 * @return {API.IssuedInvocationView<API.Identity.Link>}
 */
export const link = ({ issuer, audience, proof, id }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "identity/link",
      with: id,
    },
    proofs: proof ? [proof] : [],
  })

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer - issuer invoking this
 * @param {API.Audience} options.audience - providing service
 * @param {API.Identity.ID} [options.id] - user ID to identify
 * @param {API.Proof<[API.Store.Action]>} [options.proof] - delegated proof to perfom the operation.
 * @return {API.IssuedInvocationView<API.Identity.Identify>}
 */
export const identify = ({ issuer, audience, id = issuer.did(), proof }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "identity/identify",
      with: id,
    },
    proofs: proof ? [proof] : [],
  })

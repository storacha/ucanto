import * as Server from "@ucanto/server"
import { invoke } from "@ucanto/client"
import { capability, Link, provide, URI } from "@ucanto/server"
import * as API from "./type.js"

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Proof} options.proof
 * @param {API.Identity.MailtoID} options.id
 * @return {API.IssuedInvocationView<API.Identity.Register>}
 */
export const register = ({ issuer, audience, proof, id }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "identity/register",
      with: id,
    },
    proofs: [proof],
  })

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Identity.ID} options.id
 * @param {API.Proof} [options.proof]
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
 * @param {API.Identity.ID} options.id - user ID to identify
 * @param {API.Proof} [options.proof] - delegated proof to perfom the operation.
 * @return {API.IssuedInvocationView<API.Identity.Identify>}
 */
export const identify = ({ issuer, audience, id, proof }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "identity/identify",
      with: id,
    },
    proofs: proof ? [proof] : [],
  })

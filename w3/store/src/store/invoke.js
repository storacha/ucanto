import { invoke } from "@ucanto/client"
import * as API from "../type.js"

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Store.CARLink} options.link
 * @param {API.DID} [options.group]
 * @param {API.Proof<[API.Store.Add]>} [options.proof]
 * @return {API.IssuedInvocationView<API.Store.Add>}
 */
export const add = ({ issuer, audience, proof, group = issuer.did(), link }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "store/add",
      with: group,
      link,
    },
    proofs: proof ? [proof] : [],
  })

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer
 * @param {API.Audience} options.audience
 * @param {API.Proof<[API.Identity.Link]>} [options.proof]
 * @param {API.DID} [options.group]
 * @param {API.Store.CARLink} options.member
 * @return {API.IssuedInvocationView<API.Store.Remove>}
 */
export const remove = ({
  issuer,
  audience,
  proof,
  group = issuer.did(),
  member,
}) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "store/remove",
      with: group,
      link: member,
    },
    proofs: proof ? [proof] : [],
  })

/**
 * @param {object} options
 * @param {API.SigningAuthority} options.issuer - issuer invoking this
 * @param {API.Audience} options.audience - providing service
 * @param {API.DID} [options.group]
 * @param {API.Proof<[API.Store.Action]>} options.proof - delegated proof to perfom the operation.
 * @return {API.IssuedInvocationView<API.Store.List>}
 */
export const identify = ({ issuer, audience, group = issuer.did(), proof }) =>
  invoke({
    issuer,
    audience,
    capability: {
      can: "store/list",
      with: group,
    },
    proofs: [proof],
  })

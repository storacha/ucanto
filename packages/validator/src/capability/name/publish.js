import * as API from "./api.js"
import { ok, the, panic } from "../../../util.js"
import { CID } from "multiformats/cid"
import { violates } from "../../solver.js"
import * as DID from "@ipld/dag-ucan/src/did.js"

/**
 * @param {API.Capability} capability
 * @returns {API.Result<API.Publish|API.Resolve>}
 */
const parse = ({ can, with: resource, ...constraints }) => {
  const did = DID.parse(/** @type {any} */ (resource))
  const content = CID.asCID(constraints.content)
  const origin = CID.asCID(constraints.origin)

  if (can !== "name/publish") {
    return new ParseError("can must be name/publish")
  }

  if (!content) {
    return new ParseError("Content MUST be a CID")
  }

  if (!origin && constraints.origin != null) {
    return new ParseError("Publish origin must be a CID or null")
  }

  return ok(
    /** @type {API.Publish} */ ({
      can: "name/publish",
      with: resource,
      content,
      origin,
    })
  )
}

/**
 * @param {API.Capability} claim
 * @param {API.Capability} capability
 * @returns {boolean}
 */
const match = (claim, capability) =>
  claim.can === capability.can && claim.with === capability.with

/**
 *
 * @param {API.Publish} claim
 * @param {API.Publish} capability
 * @param {{issuer:API.DID, audience:API.DID}} context
 * @returns {{done:boolean, violations:string[]}}
 */
export const check = (claim, capability, { issuer, audience }) => {
  const violations = []
  if (capability.content != null && capability.content != claim.content) {
    violations.push("content")
  } else if (capability.origin != null && capability.origin != claim.origin) {
    violations.push("origin")
  }

  if (issuer === capability.with) {
    return { done: true, violations }
  } else {
    return { done: false, violations }
  }
}

class ParseError extends Error {}

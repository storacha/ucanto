import * as API from "../../api.js"
import { ok, the, unreachable } from "../../../util.js"
import { CID } from "multiformats/cid"
import * as DID from "@ipld/dag-ucan/src/did.js"
import {
  prepend,
  evidence,
  escaltes,
  checkWith,
  EscalationError,
  analize,
  solve,
  violates,
} from "../../solver.js"

/**
 * @typedef {{can: "store/add", with:API.DID, link: API.Link | null }} Add
 * @typedef {{can: "store/remove", with:API.DID, link: API.Link | null }} Remove
 * @typedef {{can: "store/link", with:API.DID, link: API.Link | null }} Link
 * @typedef {Add|Remove|Link} Op
 */

export const can = the("store/add")

/**
 * @param {API.Capability} capability
 * @returns {Add|null}
 */
export const parse = ({ link, with: did, ...capability }) => {
  if (capability.can === can && did.startsWith("did:")) {
    return {
      ...capability,
      can,
      with: /** @type {API.DID} */ (did),
      link: CID.asCID(link),
    }
  } else {
    return null
  }
}

/**
 * @param {Add} claim
 * @param {Add} available
 */
export const match = (claim, available) =>
  claim.can === available.can && claim.with === available.with

/**
 * @param {Add} claim
 * @param {Add} capability
 */
export const check = (claim, capability) => {
  if (!capability.link) {
    return []
  } else if (
    !claim.link ||
    claim.link.toString() !== capability.link.toString()
  ) {
    return ["link"]
  } else {
    return []
  }
}

/**
 * @param {Add} claimed
 * @param {Add[]} capabilities
 * @returns {API.Result<IterableIterator<API.Evidence<Add>>, API.ClaimError<Add>>}
 */
export const claim = (claimed, capabilities) =>
  solve(claimed, capabilities, {
    match,
    check,
  })

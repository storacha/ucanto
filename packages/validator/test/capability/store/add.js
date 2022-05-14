import { ok, the } from "../../../src/util.js"
import { CID } from "multiformats/cid"
import * as API from "../../../src/api.js"
import { solve as checkWith } from "../../../src/solver.js"
import * as UCAN from "@ipld/dag-ucan"
import {
  MalformedCapability,
  UnknownCapability,
  Failure,
} from "../../../src/error.js"
export const can = the("store/add")

/**
 * @typedef {{can: "store/add", with:API.DID, link: API.Link | null }} Add
 * @typedef {{can: "store/remove", with:API.DID, link: API.Link | null }} Remove
 * @typedef {{can: "store/link", with:API.DID, link: API.Link | null }} Link
 * @typedef {Add|Remove|Link} Op
 */

/**
 * @param {UCAN.Capability} source
 * @returns {API.Result<Add, API.UnknownCapability>}
 */
export const parse = source => {
  const {
    link,
    with: did,
    ...capability
  } = /** @type {API.Capability} */ (source)

  if (capability.can === can) {
    if (did.startsWith("did:")) {
      return {
        ...capability,
        can,
        with: /** @type {API.DID} */ (did),
        link: CID.asCID(link),
      }
    } else {
      return new MalformedCapability(source, [
        new Failure(`Expected 'with' to be 'did:' URI instead got, '${did}'`),
      ])
    }
  } else {
    return new UnknownCapability(source)
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
export const validate = (claim, capability) => {
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
 * @param {Add} claim
 * @param {Add[]} capabilities
 * @returns {API.Result<IterableIterator<API.Evidence<Add>>, API.EscalatedClaim<Add>>}
 */
export const check = (claim, capabilities) =>
  checkWith(claim, capabilities, {
    match,
    check: validate,
  })

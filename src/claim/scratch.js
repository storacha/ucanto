import * as API from "./api.js"
import { ok, the, unreachable } from "../util.js"
import { CID } from "multiformats/cid"

/**
 * @typedef {{can: "store/add", with:API.DID, link?: API.Link}} Add
 * @typedef {{can: "store/remove", with:API.DID, link?: API.Link}} Remove
 * @typedef {{can:"access/identify", with:API.DID}} Identify
 * @typedef {Add|Remove|Identify} Capability
 */

/**
 * @param {API.Capability} capability
 * @returns {Capability|null}
 */
export const parse = capability => {
  switch (capability.can) {
    case "store/add":
      return parseAdd(capability)
    case "store/remove":
      return parseRemove(capability)
    case "access/identify":
      return parseIdentify(capability)
    default:
      return null
  }
}

/**
 * @param {API.Capability} capability
 */
const parseAdd = ({ can, link, ...caveats }) => {
  return new Add({ can, link: CID.asCID(link), ...caveats })
}

/**
 *
 * @param {Capability} claimed
 * @param {Capability[]} capabilities
 */
export const claim = (claimed, capabilities) => {
  switch (claimed.can) {
    case "store/add":
      return claimAdd(claimed, capabilities)
    case "store/remove":
      return claimRemove(claimed, capabilities)
    case "access/identify":
      return claimIdentify(claim, capabilities)
    default:
      return unreachable`Unexpected capability ${claimed}`
  }
}

export const claimAdd = () => {}

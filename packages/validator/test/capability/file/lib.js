import * as API from "./api.js"
import { ok, the, unreachable } from "../../../src/util.js"
import { CID } from "multiformats/cid"
import * as DID from "@ipld/dag-ucan/src/did.js"
import { solve, violates } from "../../../src/solver.js"
import { MalformedCapability, UnknownCapability } from "../../../src/error.js"

/**
 * @param {API.Capability} capability
 * @returns {API.Result<API.Capability, API.UnknownCapability>}
 */
export const parse = capability => {
  const { can, ...constraints } = capability
  switch (can) {
    case "file/read":
    case "file/write":
    case "file/read+write":
      constraints.with.startsWith("file://")
        ? ok({ ...constraints, can })
        : new MalformedCapability({ can, ...constraints }, [])
    default:
      return new UnknownCapability(capability)
  }
}

/**
 * @param {API.Capability} claim
 * @param {API.Capability[]} capabilities
 */
export const check = (claim, capabilities) => {
  switch (claim.can) {
    case "file/read":
    case "file/write":
      return checkDelegated(claim, capabilities)
    case "file/read+write":
      return checkAmplified(claim, capabilities)
    default:
      return unreachable`Unknown capability was passed ${claim}`
  }
}

/**
 * @param {API.Read|API.Write} claim
 * @param {API.Capability[]} capabilities
 */
export const checkDelegated = (claim, capabilities) => {
  const result = []
  for (const capabality of capabilities) {
    if (claim.can === capabality.can && matches(claim, capabality)) {
      result.push([capabality])
    }
  }
  return result
}

/**
 * @param {API.ReadWrite} claim
 * @param {API.Capability[]} capabilities
 */
export const checkAmplified = (claim, capabilities) => {
  const reads = []
  const writes = []
  /** @type {API.Capability[][]} */
  const matched = []

  for (const capabality of capabilities) {
    switch (capabality.can) {
      case "file/read+write": {
        if (matches(claim, capabality)) {
          matched.push([capabality])
        }
        break
      }
      case "file/read": {
        if (matches(claim, capabality)) {
          reads.push(capabality)
          for (const write of writes) {
            matched.push([capabality, write])
          }
        }
        break
      }
      case "file/write": {
        if (matches(claim, capabality)) {
          writes.push(capabality)
          for (const read of reads) {
            matched.push([read, capabality])
          }
        }
        break
      }
    }
  }

  return matched
}

/**
 * @param {API.Capability} claim
 * @param {API.Capability} capability
 */
const matches = (claim, capability) => capability.with.startsWith(claim.with)

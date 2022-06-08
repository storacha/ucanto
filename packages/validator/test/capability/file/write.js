import * as API from "./api.js"
import { ok, the, unreachable } from "../../../src/util.js"
import { MalformedCapability, UnknownCapability } from "../../../src/error.js"
import { or } from "../../../src/parse.js"
import * as ReadWrite from "./read+write.js"
export const ability = the("file/write")

/**
 * @type {API.Parse<API.Write, API.Write|API.ReadWrite>}
 */
export const match = capability => {
  if (capability.can === ability) {
    if (capability.with.startsWith("file://")) {
      return { capability, parse, check }
    } else {
      return new MalformedCapability(capability)
    }
  } else {
    return new UnknownCapability(capability)
  }
}

/**
 * @param {API.Write} claim
 * @param {(API.Write|API.ReadWrite)[]} capabilities
 */
export const check = (claim, capabilities) => {
  const results = []
  for (const capabality of capabilities) {
    if (claim.with.startsWith(capabality.with)) {
      results.push([capabality])
    }
  }
  return results
}

export const parse = or(match, ReadWrite.match)

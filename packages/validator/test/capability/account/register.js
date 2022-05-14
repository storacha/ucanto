import * as API from "./api.js"
import { ok } from "../../../src/util.js"
import { MalformedCapability, UnknownCapability } from "../../../src/error.js"

/**
 * @param {API.Capability} capability
 * @return {API.Result<API.Register, API.InvalidCapability>}
 */
export const match = capability => {
  if (capability.can === "account/register" && isDIDKey(capability.with)) {
    return ok(/** @type {API.Register} */ (capability))
  } else {
    return new UnknownCapability(capability)
  }
}

/**
 *
 * @param {string} input
 * @returns {input is `did:key:${string}`}
 */
const isDIDKey = input => input.startsWith("did:key:")
/**
 * @param {API.Verify} capability
 * @returns {API.Result<API.Verify, API.InvalidCapability>}
 */
export const parse = capability => {}

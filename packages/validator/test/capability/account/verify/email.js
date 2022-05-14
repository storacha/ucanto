import * as API from "../api.js"
import { ok } from "../../../../src/util.js"
import {
  MalformedCapability,
  UnknownCapability,
} from "../../../../src/error.js"

/**
 *
 * @param {API.Capability} capability
 * @returns {API.Result<API.VerifyEmail, API.InvalidCapability>}
 */
export const parse = capability => {
  if (
    capability.can === "account/verify" &&
    capability.with.startsWith("mailto:")
  ) {
    return ok(/** @type {API.VerifyEmail} */ (capability))
  } else {
    return new UnknownCapability(capability)
  }
}

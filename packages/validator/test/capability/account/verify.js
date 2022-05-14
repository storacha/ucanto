import * as API from "./api.js"
import { MalformedCapability, UnknownCapability } from "../../../src/error.js"

/**
 * @param {API.Capability} capability
 * @return {API.Result<API.Verify, API.InvalidCapability>}
 */
export const match = capability => {
  if (capability.can === "account/verify") {
    const result = isMailtoURI(capability.with)
      ? /** @type {API.VerifyEmail} */ (capability)
      : capability.with.startsWith("did:web:github:")
      ? /** @type {API.VerifyGithub} */ (capability)
      : capability.with.startsWith("did:web:twitter:")
      ? /** @type {API.VerifyTwitter} */ (capability)
      : new MalformedCapability(capability, [])
    return result
  } else {
    return new UnknownCapability(capability)
  }
}

export const parse = match

/**
 * @param {string} input
 * @returns {input is `mailto:${string}@${string}.${string}`}
 */

const isMailtoURI = input => input.match(/mailto:.+@.+\..+/) != null

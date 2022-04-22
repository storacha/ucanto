import * as API from "./api.js"
import { ok, the } from "../../test/services/util.js"
export * from "./api.js"

/**
 * @template {API.CapabilityView} C
 * @param {API.Capability} capability
 * @param {API.UCANView<C>} ucan
 * @returns {API.Result<API.Access<C>, API.InvalidClaim<C>>}
 */
export const access = (capability, ucan) => {
  return ok({
    ok: the(true),
    capability: ucan.capabilities[0],
    to: ucan.ucan.audience,
    proof: {
      by: ucan.ucan.issuer,
      granted: [],
      proof: null,
    },
  })
}

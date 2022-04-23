import * as API from "./api.js"

/**
 * @template {API.Capability} C
 * @template {API.CapabilityView} V
 * @param {API.View<C>} ucan
 * @param {API.CapabilityParser<V>} parser
 * @returns {API.UCANView<V>}
 */
export const parse = (ucan, parser) => {
  const unkownCapabilities = []
  const capabilities = []
  for (const capability of ucan.capabilities) {
    const known = parser.parse(capability)
    if (known) {
      capabilities.push(known)
    } else {
      unkownCapabilities.push(capability)
    }
  }

  const view = {
    ucan,
    capabilityParser: parser,
    unkownCapabilities: unkownCapabilities.values(),
    capabilities,
  }

  return view
}

/**
 * @template {API.CapabilityView} C
 * @param {API.Capability} capability
 * @param {API.UCANView<C>} ucan
 */
export const access = (capability, ucan) => {
  const result = ucan.capabilityParser.parse(capability)
  if (result.ok) {
    const capability = result.value
    const available = ucan.capabilities
    const claim = API.claim(capability, available)
    if (!claim.ok) {
      return {
        ok: false,
        error: {
          _: {
            name: "InvalidClaim",
            claim: capability,
            by: ucan.ucan.audience,
            to: ucan.ucan.issuer,
            reason: {
              name: "ViolatingClaim",
              from: ucan.ucan.audience,
              to: ucan.ucan.issuer,
              claim: capability,
              escalates: claim,
            },
          },
        },
      }
    } else {
      const evidence = claim.value
      for (const { capaibilites } of evidence) {
      }
      return {
        ok: true,
        capability,
        to: ucan.ucan.audience,
        proof: {
          by: ucan.ucan.audience,
          granted: [capability],
        },
      }
    }
  }
}

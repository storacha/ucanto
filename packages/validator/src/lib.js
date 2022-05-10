import { ok, the } from "./util.js"
import * as API from "./api.js"
import * as UCAN from "@ipld/dag-ucan"
import { isLink, Delegation } from "@ucanto/core"

const empty = () => []

/**
 * @param {UCAN.Proof} proof
 */
const canNotResolve = proof => new ProofNotFound(proof)

/**
 * @template C
 * @param {API.Invocation|API.Delegation} invocation
 * @param {API.ValidationOptions<C>} config
 * @returns {Promise<API.Result<API.Access<C>, API.InvalidClaim<C> | API.UnsupportedClaim>>}
 */
export const access = async (
  invocation,
  { canIssue, my = empty, resolve = canNotResolve, parse, check }
) => {
  const config = { canIssue, my, resolve, parse, check }
  const claim = parse(invocation.capabilities[0])
  if (claim.ok) {
    const authorization = await authorize(claim.value, invocation, config)
    if (authorization.ok) {
      return ok({
        capability: claim.value,
        proof: authorization.value,
      })
    } else {
      return authorization
    }
  } else {
    return new UnsupportedClaim({
      issuer: invocation.issuer,
      capability: invocation.capabilities[0],
      message: "unknown capability",
    })
  }
}

/**
 * @template C
 * @param {C} capability
 * @param {API.Delegation} delegation
 * @param {API.ValidationOptions<C>} config
 * @returns {Promise<API.Result<API.Authorization<C>, API.InvalidClaim<C>>>}
 */
export const authorize = async (
  capability,
  delegation,
  { canIssue, resolve = canNotResolve, parse, check, my }
) => {
  const { issuer } = delegation
  const signature = await validate(delegation)
  if (!signature.ok) {
    return new InvalidClaim(delegation, capability, signature)
  }

  if (canIssue(capability, delegation.issuer.did())) {
    // If can self issue no need to evaluate this any further and just provide
    // access.
    return ok({
      issuer: delegation.issuer,
      audience: delegation.issuer,
      capabilities: [capability],
      proofs: [],
    })
  } else {
    const errors = []
    for (const proof of delegation.proofs) {
      const result = isLink(proof) ? await resolve(proof) : ok(proof)
      if (!result.ok) {
        return new InvalidClaim(delegation, capability, result)
      } else {
        const proof = result.value
        if (proof.audience.did() !== issuer.did()) {
          errors.push(new WrongAudience(proof, issuer))
        } else {
          const { known, unknown } = parseCapabilities(proof, parse, my)
          if (known.length > 0) {
            const result = check(capability, known)
            if (result.ok) {
              for (const evidence of result.value) {
                const proofs = []
                for (const capability of evidence.capabilities) {
                  const authorization = await authorize(capability, proof, {
                    canIssue,
                    resolve,
                    parse,
                    check,
                  })
                  if (!authorization.ok) {
                    break
                  } else {
                    proofs.push(authorization.value)
                  }
                }

                return ok({
                  issuer: proof.issuer,
                  audience: proof.audience,
                  capabilities: evidence.capabilities,
                  proofs,
                })
              }
            } else {
              return new InvalidClaim(
                delegation,
                capability,
                new ViolatingClaim(delegation, capability, result.esclacations)
              )
            }
          }
        }
      }
    }
    return new InvalidClaim(
      delegation,
      capability,
      new UnfundedClaim(delegation, capability)
    )
  }
}

const ALL = "*"

/**
 * @template C
 * @param {API.Delegation} delegation
 * @param {API.ValidationOptions<C>['parse']} parse
 * @param {API.ValidationOptions<C>['my']} my
 */
const parseCapabilities = (delegation, parse, my = empty) => {
  const unknown = []
  const known = []
  for (const capability of delegation.capabilities) {
    const result = parse(capability)
    if (result.ok) {
      known.push(result.value)
    } else {
      const can = capability.can
      const resource =
        parseMyURI(capability.with, delegation.issuer.did()) ||
        parseAsURI(capability.with)

      const capabilities = resource ? my(resource.did) : []
      const protocol = resource ? resource.protocol : ""

      for (const capability of capabilities) {
        const matches =
          capability.with.startsWith(protocol) ||
          capability.can === can ||
          can === ALL

        if (matches) {
          const result = parse(capability)
          if (result.ok) {
            known.push(result.value)
          } else {
            unknown.push(capability)
          }
        }
      }
    }
  }

  return { known, unknown }
}

const AS_PATTERN = /as:(.*):(.*)/
const MY = /my:(.*)/

/**
 * @param {string} uri
 * @returns {{did:API.DID, protocol:string}|null}
 */
const parseAsURI = uri => {
  const [, did, kind] = AS_PATTERN.exec(uri) || []
  return did != null && kind != null
    ? {
        did: /** @type {API.DID} */ (did),
        protocol: kind === ALL ? "" : `${kind}:`,
      }
    : null
}

/**
 * @param {string} uri
 * @param {API.DID} did
 */

const parseMyURI = (uri, did) => {
  const [, kind] = MY.exec(uri) || []
  return kind != null ? { did, protocol: kind === ALL ? "" : `${kind}:` } : null
}

/**
 * @param {API.Delegation | API.Invocation} delegation
 * @returns {Promise<API.Result<null, API.InvalidSignature|API.ExpriedClaim|API.InactiveClaim>>}
 */
const validate = async delegation => {
  if (UCAN.isExpired(delegation.data)) {
    return new ExpriedClaim(delegation)
  } else if (UCAN.isTooEarly(delegation.data)) {
    return new InactiveClaim(delegation)
  } else {
    return await verifySignature(delegation)
  }
}

/**
 * @template C
 */
class Claim {
  /**
   * @param {C} claim
   * @param {API.Delegation} delegation
   */
  constructor(claim, delegation) {
    this.claim = claim
    this.delegation = delegation
  }
}

/**
 * @param {API.Delegation | API.Invocation} delegation
 * @returns {Promise<API.Result<null, API.InvalidSignature>>}
 */
const verifySignature = async delegation => {
  const valid = await UCAN.verifySignature(delegation.data, delegation.issuer)

  return valid ? ok() : new InvalidSignature(delegation)
}

/**
 * @implements {API.UnsupportedClaim}
 */
class UnsupportedClaim extends Error {
  /**
   * @param {{
   * issuer: API.UCAN.Identity
   * capability: API.UCAN.Capability
   * message?: string
   * }} data
   */
  constructor({ issuer, capability, message }) {
    super("Unknow capability")
    this.issuer = issuer
    this.capability = capability
    this.name = the("UnsupportedClaim")
  }
}

/**
 * @template C
 * @implements {API.InvalidClaim<C>}
 */
class InvalidClaim extends Error {
  /**
   * @param {API.Delegation} delegation
   * @param {C} claim
   * @param {API.ClaimErrorReason<C>} reason
   */
  constructor(delegation, claim, reason) {
    super()
    this.name = the("InvalidClaim")
    this.claim = claim
    this.issuer = delegation.issuer
    this.audience = delegation.audience
    this.reason = reason
  }
  get message() {
    return `Invalid claim ${JSON.stringify(this.claim)}
${this.reason}
`
  }
}

/**
 * @implements {API.ExpriedClaim}
 */
class ExpriedClaim extends Error {
  /**
   * @param {API.Invocation|API.Delegation} invocation
   */
  constructor(invocation) {
    super("Expired claim")
    this.name = the("ExpriedClaim")
    this.issuer = invocation.issuer
    this.audience = invocation.audience
    this.expiredAt = invocation.data.expiration
  }
}

/**
 * @implements {API.InactiveClaim}
 */
class InactiveClaim extends Error {
  /**
   * @param {API.Invocation|API.Delegation} invocation
   */
  constructor(invocation) {
    super("Expired claim")
    this.name = the("InactiveClaim")
    this.issuer = invocation.issuer
    this.audience = invocation.audience
    this.activeAt = /** @type {number} */ (invocation.data.notBefore)
  }
}

/**
 * @implements {API.InvalidSignature}
 */

class InvalidSignature extends Error {
  /**
   * @param {API.Invocation|API.Delegation} delegation
   */
  constructor(delegation) {
    super("Invalid signature")
    this.name = the("InvalidSignature")
    this.issuer = delegation.issuer
    this.audience = delegation.audience
    this.delegation = delegation.data
  }
}

class ProofNotFound extends Error {
  /**
   * @param {UCAN.Proof} link
   */
  constructor(link) {
    super(`Proof ${link} not found`)
    this.name = the("ProofNotFound")
    this.link = link
  }
}

/**
 * @template C
 * @implements {API.UnfundedClaim<C>}
 */
class UnfundedClaim extends Error {
  /**
   * @param {API.Delegation} delegation
   * @param {C} claim
   */
  constructor(delegation, claim) {
    super(`No proof for the claim is found`)
    this.name = the("UnfundedClaim")
    this.claim = claim
    this.issuer = delegation.issuer
    this.audience = delegation.audience
  }
}

/**
 * @implements {API.WrongAudience}
 */
class WrongAudience extends Error {
  /**
   * @param {API.Delegation} delegation
   * @param {UCAN.Audience} audience
   */
  constructor(delegation, audience) {
    super(
      `Invalid delegation audience ${delegation.audience.did()} does not match ${audience.did()}`
    )
    this.name = the("WrongAudience")
    this.delegation = delegation
    this.audience = audience
  }
  get issuer() {
    return this.delegation.issuer
  }
}

/**
 * @template C
 * @implements {API.ViolatingClaim<C>}
 */
class ViolatingClaim extends Error {
  /**
   * @param {API.Delegation} delegation
   * @param {C} claim
   * @param {API.EscalationError<C>[]} escalations
   */
  constructor(delegation, claim, escalations) {
    super()
    this.name = the("ViolatingClaim")
    this.issuer = delegation.issuer
    this.audience = delegation.audience
    this.claim = claim
    this.escalates = escalations
  }
}

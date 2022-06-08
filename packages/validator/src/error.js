import * as API from "./api.js"
import { the } from "./util.js"
import { CID } from "multiformats"
import * as Digest from "multiformats/hashes/digest"

/**
 * @implements {API.Problem}
 */
export class Failure extends Error {
  /** @type {true} */
  get error() {
    return true
  }
  describe() {
    return this.name
  }
  get message() {
    return this.describe()
  }
}

/**
 * @implements {API.InvalidDelegation}
 */
export class InvalidDelegation extends Failure {
  /**
   * @param {import('./v3/api').Match} claimed
   * @param {object} delegated
   * @param {API.EscalatedDelegation|API.MalformedCapability|API.InvalidDelegation} cause
   */
  constructor(claimed, delegated, cause) {
    super()
    this.claimed = claimed
    this.delegated = delegated
    this.cause = cause
    /** @type {"InvalidDelegation"} */
    this.name = "InvalidDelegation"
  }
  describe() {
    return `Can not derive ${this.claimed} from ${this.delegated}, ${this.cause.message}`
  }
}

export class EscalatedCapability extends Failure {
  /**
   * @param {import('./v3/api').ParsedCapability} claimed
   * @param {object} delegated
   * @param {API.Problem} cause
   */
  constructor(claimed, delegated, cause) {
    super()
    this.claimed = claimed
    this.delegated = delegated
    this.cause = cause
    this.name = the("EscalatedCapability")
  }
  describe() {
    return `Constraint violation: ${this.cause.message}`
  }
}

/**
 * @implements {API.DelegationError}
 */
export class DelegationError extends Failure {
  /**
   * @param {(API.InvalidCapability | API.EscalatedDelegation | API.DelegationError)[]} causes
   * @param {object} context
   */
  constructor(causes, context) {
    super()
    this.name = the("InvalidClaim")
    this.causes = causes
    this.context = context
  }
  describe() {
    return [
      `Can not derive ${this.context} from delegated capabilities:`,
      ...this.causes.map(cause => li(cause.message)),
    ].join("\n")
  }

  /**
   * @type {API.InvalidCapability | API.EscalatedDelegation | API.DelegationError}
   */
  get cause() {
    if (this.causes.length !== 1) {
      return this
    } else {
      const [cause] = this.causes
      const value = cause.name === "InvalidClaim" ? cause.cause : cause
      Object.defineProperties(this, { cause: { value } })
      return value
    }
  }
}

// /**
//  * @implements {API.InvalidDelegation}
//  */
// export class InvalidDelegation extends Failure {
//   /**
//    * @param {API.InvalidCapability | API.InvalidDelegation} cause
//    * @param {object} context
//    */
//   constructor(cause, context) {
//     super()
//     this.name = the("InvalidDelegation")
//     this.cause = cause
//     this.context = context
//   }
//   describe() {
//     return [
//       `Can not derive ${this.context} from delegated capabilities`,
//       li(this.cause.message),
//     ].join("\n")
//   }
// }

/**
 * @template C
 * @implements {API.EscalationError<C>}
 */
export class EscalationError extends Failure {
  /**
   *
   * @param {C} claimed
   * @param {C} escalated
   * @param {API.ConstraintViolationError<C>[]} violations
   */
  constructor(claimed, escalated, violations) {
    super()
    this.name = the("EscalationError")
    this.claimed = claimed
    this.escalated = escalated
    this.violations = violations
  }
  describe() {
    return [
      `Claimed capability ${format(
        this.claimed
      )} violates imposed constrainsts:`,
      ...[...this.violations].map($ => li(`${$.message}`)),
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.ConstraintViolationError<C>}
 */
export class ConstraintViolationError extends Failure {
  /**
   * @param {API.Constraint<C>} claimed
   * @param {API.Constraint<C>} violated
   */
  constructor(claimed, violated) {
    super()
    this.name = the("ConstraintViolationError")
    this.claimed = claimed
    this.violated = violated
  }

  describe() {
    const { claimed, violated } = this
    return `constraint ${format({
      [violated.name]: violated.value,
    })} is violated by ${format({ [claimed.name]: claimed.value })}`
  }
  get message() {
    return this.describe()
  }
}

/**
 * @template C
 * @implements {API.EscalatedClaim<C>}
 */
export class EscalatedClaim extends Failure {
  /**
   * @param {API.EscalationError<C>[]} esclacations
   */
  constructor(esclacations) {
    super()
    this.name = the("EscalatedClaim")
    this.esclacations = esclacations
  }
  describe() {
    return [
      `Capability escalates constraints`,
      ...this.esclacations.map($ => li($.message)),
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.InvalidClaim<C>}
 */
export class InvalidClaim extends Failure {
  /**
   * @param {C} capability
   * @param {API.Delegation} delegation
   * @param {API.ProofError<C>[]} proofs
   */
  constructor(capability, delegation, proofs) {
    super()
    this.name = the("InvalidClaim")
    this.capability = capability
    this.delegation = delegation
    this.proofs = proofs
  }
  describe() {
    const capability = format(this.capability)
    const did = this.delegation.issuer.did()
    const proofs =
      this.proofs.length > 0
        ? this.proofs.map((proof, n) => li(`prf:${n} ${proof.message}`))
        : [li(`There are no delegated proofs`)]

    return [
      `Claimed capability ${capability} is invalid`,
      li(`Capability can not be (self) issued by '${did}'`),
      ...proofs,
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.InvalidClaim<C>}
 */
export class NoEvidence extends Failure {
  /**
   * @param {C} capability
   * @param {API.Delegation} delegation
   * @param {API.DelegationError[]} errors
   * @param {API.Capability[]} unknown
   */
  constructor(capability, delegation, errors, unknown) {
    super()
    this.name = the("InvalidClaim")
    this.capability = capability
    this.delegation = delegation
    this.errors = errors
    this.unknown = unknown
  }
  describe() {
    const capability = format(this.capability)

    return [
      `Does not delegate matching capability ${capability}`,
      ...this.errors.map(error => li(`${error.message}`)),
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.InvalidEvidence<C>}
 */
export class InvalidEvidence extends Failure {
  /**
   * @param {API.Evidence<C>} evidence
   * @param {API.Delegation} delegation
   * @param {API.InvalidClaim<C>[]} proofs
   */
  constructor(evidence, delegation, proofs) {
    super()
    this.name = the("InvalidEvidence")
    this.evidence = evidence
    this.delegation = delegation
    this.proofs = proofs
  }
  describe() {
    return [
      `Claimed capability requires delegated capabilities:`,
      ...this.evidence.capabilities.map($ => li(format($))),
      `Which could not be satifised because:`,
      ...this.proofs.map($ => li($.message)),
    ].join("\n")
  }
}
/**
 * @implements {API.InvalidSignature}
 */
export class InvalidSignature extends Failure {
  /**
   * @param {API.Delegation} delegation
   */
  constructor(delegation) {
    super()
    this.name = the("InvalidSignature")
    this.delegation = delegation
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.delegation.audience
  }
  describe() {
    return [`Signature is invalid`].join("\n")
  }
}

/**
 * @implements {API.UnavailableProof}
 */
export class UnavailableProof extends Failure {
  /**
   * @param {API.UCAN.Proof} link
   */
  constructor(link) {
    super()
    this.name = the("UnavailableProof")
    this.link = link
  }
  describe() {
    return `Linked proof '${this.link}' is not included nor available locally`
  }
}

/**
 * @implements {API.InvalidAudience}
 */
export class InvalidAudience extends Failure {
  /**
   * @param {API.UCAN.Identity} audience
   * @param {API.Delegation} delegation
   */
  constructor(audience, delegation) {
    super()
    this.name = the("InvalidAudience")
    this.audience = audience
    this.delegation = delegation
  }
  describe() {
    return `Delegates to '${this.delegation.audience.did()}' instead of '${this.audience.did()}'`
  }
}

/**
 * @implements {API.MalformedCapability}
 */
export class MalformedCapability extends Failure {
  /**
   * @param {API.Capability} capability
   * @param {API.Problem} cause
   */
  constructor(capability, cause) {
    super()
    this.name = the("MalformedCapability")
    this.capability = capability
    this.cause = cause
  }
  describe() {
    return [
      `Encountered malformed '${this.capability.can}' capability: ${format(
        this.capability
      )}`,
      li(this.cause.message),
    ].join("\n")
  }
}

export class UnknownCapability extends Failure {
  /**
   * @param {API.Capability} capability
   */
  constructor(capability) {
    super()
    this.name = the("UnknownCapability")
    this.capability = capability
  }
  describe() {
    return `Encountered unknown capability: ${format(this.capability)}`
  }
}

export class Expired extends Failure {
  /**
   * @param {API.Delegation & { expiration: number }} delegation
   */
  constructor(delegation) {
    super()
    this.name = the("Expired")
    this.delegation = delegation
  }
  describe() {
    return `Expired on ${new Date(this.delegation.expiration * 1000)}`
  }
  get expiredAt() {
    return this.delegation.expiration
  }
}

export class NotValidBefore extends Failure {
  /**
   * @param {API.Delegation & { notBefore: number }} delegation
   */
  constructor(delegation) {
    super()
    this.name = the("NotValidBefore")
    this.delegation = delegation
  }
  describe() {
    return `Not valid before ${new Date(this.delegation.notBefore * 1000)}`
  }
  get validAt() {
    return this.delegation.notBefore
  }
}

/**
 * @template C
 */
export class ClaimError extends Failure {
  /**
   * @param {API.EscalationError<C>[]} esclacations
   * @param {API.UCAN.Capability[]} unknownCapabilities
   */
  constructor(esclacations, unknownCapabilities) {
    super()
    this.name = the("ClaimError")
    this.esclacations = esclacations
    this.unknownCapabilities = unknownCapabilities
  }
}

/**
 * @param {unknown} capability
 * @param {string|number} [space]
 */

const format = (capability, space) =>
  JSON.stringify(
    capability,
    (key, value) => {
      if (
        value &&
        value.hash instanceof Uint8Array &&
        typeof value.code === "number" &&
        typeof value.version === "number"
      ) {
        return CID.create(
          value.version,
          value.code,
          Digest.decode(value.hash)
        ).toString()
      } else {
        return value
      }
    },
    space
  )

/**
 * @param {string} message
 */
export const indent = (message, indent = "  ") =>
  `${indent}${message.split("\n").join(`\n${indent}`)}`

/**
 * @param {string} message
 */
export const li = message => indent(`- ${message}`)

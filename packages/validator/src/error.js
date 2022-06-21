import * as API from '@ucanto/interface'
import { the } from './util.js'

/**
 * @implements {API.Failure}
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

  toJSON() {
    const { error, name, message } = this
    return { error, name, message }
  }
}

export class EscalatedCapability extends Failure {
  /**
   * @param {API.ParsedCapability} claimed
   * @param {object} delegated
   * @param {API.Failure} cause
   */
  constructor(claimed, delegated, cause) {
    super()
    this.claimed = claimed
    this.delegated = delegated
    this.cause = cause
    this.name = the('EscalatedCapability')
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
    this.name = the('InvalidClaim')
    this.causes = causes
    this.context = context
  }
  describe() {
    return [
      `Can not derive ${this.context} from delegated capabilities:`,
      ...this.causes.map((cause) => li(cause.message)),
    ].join('\n')
  }

  /**
   * @type {API.InvalidCapability | API.EscalatedDelegation | API.DelegationError}
   */
  get cause() {
    if (this.causes.length !== 1) {
      return this
    } else {
      const [cause] = this.causes
      const value = cause.name === 'InvalidClaim' ? cause.cause : cause
      Object.defineProperties(this, { cause: { value } })
      return value
    }
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
    this.name = the('InvalidSignature')
    this.delegation = delegation
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.delegation.audience
  }
  describe() {
    return [`Signature is invalid`].join('\n')
  }
}

/**
 * @implements {API.UnavailableProof}
 */
export class UnavailableProof extends Failure {
  /**
   * @param {API.UCAN.Proof} link
   * @param {Error} [cause]
   */
  constructor(link, cause) {
    super()
    this.name = the('UnavailableProof')
    this.link = link
    this.cause = cause
  }
  describe() {
    return [
      `Linked proof '${this.link}' is not included nor could be resolved`,
      ...(this.cause
        ? [li(`Provided resolve failed: ${this.cause.message}`)]
        : []),
    ].join('\n')
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
    this.name = the('InvalidAudience')
    this.audience = audience
    this.delegation = delegation
  }
  describe() {
    return `Delegates to '${this.delegation.audience.did()}' instead of '${this.audience.did()}'`
  }
  toJSON() {
    const { error, name, audience, message } = this
    return {
      error,
      name,
      audience: audience.did(),
      delegation: { audience: this.delegation.audience.did() },
      message,
    }
  }
}

/**
 * @implements {API.MalformedCapability}
 */
export class MalformedCapability extends Failure {
  /**
   * @param {API.Capability} capability
   * @param {API.Failure} cause
   */
  constructor(capability, cause) {
    super()
    this.name = the('MalformedCapability')
    this.capability = capability
    this.cause = cause
  }
  describe() {
    return [
      `Encountered malformed '${this.capability.can}' capability: ${format(
        this.capability
      )}`,
      li(this.cause.message),
    ].join('\n')
  }
}

export class UnknownCapability extends Failure {
  /**
   * @param {API.Capability} capability
   */
  constructor(capability) {
    super()
    this.name = the('UnknownCapability')
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
    this.name = the('Expired')
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
    this.name = the('NotValidBefore')
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
 * @param {unknown} capability
 * @param {string|number} [space]
 */

const format = (capability, space) =>
  JSON.stringify(
    capability,
    (key, value) => {
      if (value && value.asCID === value) {
        return value.toString()
      } else {
        return value
      }
    },
    space
  )

/**
 * @param {string} message
 */
export const indent = (message, indent = '  ') =>
  `${indent}${message.split('\n').join(`\n${indent}`)}`

/**
 * @param {string} message
 */
export const li = (message) => indent(`- ${message}`)

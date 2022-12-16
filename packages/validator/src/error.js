import * as API from '@ucanto/interface'
import { the } from './util.js'
import { isLink } from 'multiformats/link'

/**
 * @implements {API.Failure}
 */
export class Failure extends Error {
  /** @type {true} */
  get error() {
    return true
  }
  /* c8 ignore next 3 */
  describe() {
    return this.name
  }
  get message() {
    return this.describe()
  }

  toJSON() {
    const { error, name, message, stack } = this
    return { error, name, message, stack }
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
      ...this.causes.map(cause => li(cause.message)),
    ].join('\n')
  }

  /**
   * @type {API.InvalidCapability | API.EscalatedDelegation | API.DelegationError}
   */
  get cause() {
    /* c8 ignore next 9 */
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
   * @param {API.Verifier} verifier
   */
  constructor(delegation, verifier) {
    super()
    this.name = the('InvalidSignature')
    this.delegation = delegation
    this.verifier = verifier
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.delegation.audience
  }
  get key() {
    return this.verifier.toDIDKey()
  }
  describe() {
    const issuer = this.issuer.did()
    const key = this.key
    return (
      issuer.startsWith('did:key')
        ? [
            `Proof ${this.delegation.cid} does not has a valid signature from ${key}`,
          ]
        : [
            `Proof ${this.delegation.cid} issued by ${issuer} does not has a valid signature from ${key}`,
            `  ℹ️ Probably issuer signed with a different key, which got rotated, invalidating delegations that were issued with prior keys`,
          ]
    ).join('\n')
  }
}

/**
 * @implements {API.UnavailableProof}
 */
export class UnavailableProof extends Failure {
  /**
   * @param {API.UCAN.Link} link
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
      `Linked proof '${this.link}' is not included and could not be resolved`,
      ...(this.cause
        ? [li(`Proof resolution failed with: ${this.cause.message}`)]
        : []),
    ].join('\n')
  }
}

export class DIDKeyResolutionError extends Failure {
  /**
   * @param {API.UCAN.DID} did
   * @param {API.Unauthorized} [cause]
   */
  constructor(did, cause) {
    super()
    this.name = the('DIDKeyResolutionError')
    this.did = did
    this.cause = cause
  }
  describe() {
    return [
      `Unable to resolve '${this.did}' key`,
      ...(this.cause ? [li(`Resolution failed: ${this.cause.message}`)] : []),
    ].join('\n')
  }
}

/**
 * @implements {API.InvalidAudience}
 */
export class InvalidAudience extends Failure {
  /**
   * @param {API.UCAN.Principal} audience
   * @param {API.Delegation} delegation
   */
  constructor(audience, delegation) {
    super()
    this.name = the('InvalidAudience')
    this.audience = audience
    this.delegation = delegation
  }
  describe() {
    return `Delegation audience is '${this.delegation.audience.did()}' instead of '${this.audience.did()}'`
  }
  toJSON() {
    const { error, name, audience, message, stack } = this
    return {
      error,
      name,
      audience: audience.did(),
      delegation: { audience: this.delegation.audience.did() },
      message,
      stack,
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
  /* c8 ignore next 3 */
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
    return `Proof ${this.delegation.cid} has expired on ${new Date(
      this.delegation.expiration * 1000
    )}`
  }
  get expiredAt() {
    return this.delegation.expiration
  }
  toJSON() {
    const { error, name, expiredAt, message, stack } = this
    return {
      error,
      name,
      message,
      expiredAt,
      stack,
    }
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
    return `Proof ${this.delegation.cid} is not valid before ${new Date(
      this.delegation.notBefore * 1000
    )}`
  }
  get validAt() {
    return this.delegation.notBefore
  }
  toJSON() {
    const { error, name, validAt, message, stack } = this
    return {
      error,
      name,
      message,
      validAt,
      stack,
    }
  }
}

/**
 * @param {unknown} capability
 * @param {string|number} [space]
 */

const format = (capability, space) =>
  JSON.stringify(
    capability,
    (_key, value) => {
      /* c8 ignore next 2 */
      if (isLink(value)) {
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
export const li = message => indent(`- ${message}`)

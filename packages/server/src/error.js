import * as API from '@ucanto/interface'
import { Failure } from '@ucanto/core'
export { MalformedCapability } from '@ucanto/validator'

/**
 * @implements {API.HandlerNotFound}
 */
export class HandlerNotFound extends RangeError {
  /**
   * @param {API.Capability} capability
   */
  constructor(capability) {
    super()
    /** @type {true} */
    this.error = true
    this.capability = capability
  }
  /** @type {'HandlerNotFound'} */
  get name() {
    return 'HandlerNotFound'
  }
  get message() {
    return `service does not implement {can: "${this.capability.can}"} handler`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      capability: {
        can: this.capability.can,
        with: this.capability.with,
      },
      message: this.message,
      stack: this.stack,
    }
  }
}

export class HandlerExecutionError extends Failure {
  /**
   * @param {API.Capability} capability
   * @param {Error} cause
   */
  constructor(capability, cause) {
    super()
    this.capability = capability
    this.cause = cause
    /** @type { true } */
    this.error = true
  }

  /** @type {'HandlerExecutionError'} */
  get name() {
    return 'HandlerExecutionError'
  }
  get message() {
    return `service handler {can: "${this.capability.can}"} error: ${this.cause.message}`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      capability: {
        can: this.capability.can,
        with: this.capability.with,
      },
      cause: {
        ...this.cause,
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      },
      message: this.message,
      stack: this.stack,
    }
  }
}

export class InvocationCapabilityError extends Error {
  /**
   * @param {any} caps
   */
  constructor(caps) {
    super()
    /** @type {true} */
    this.error = true
    this.caps = caps
  }
  get name() {
    return 'InvocationCapabilityError'
  }
  get message() {
    return `Invocation is required to have a single capability.`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      message: this.message,
      capabilities: this.caps,
    }
  }
}

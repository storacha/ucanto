import * as API from '@ucanto/interface'

/**
 * Creates the success result containing given `value`. Throws if
 * `null` or `undefined` passed to encourage use of units instead.
 *
 * @template {{}|string|boolean|number} T
 * @param {T} value
 * @returns {{ok: T, error?:undefined}}
 */
export const ok = value => {
  if (value == null) {
    throw new TypeError(`ok(${value}) is not allowed, consider ok({}) instead`)
  } else {
    return { ok: value }
  }
}

/**
 * Creates the failing result containing given `cause` of error.
 * Throws if `cause` is `null` or `undefined` to encourage
 * passing descriptive errors instead.
 *
 * @template {{}|string|boolean|number} X
 * @param {X} cause
 * @returns {{ok?:undefined, error:X}}
 */
export const error = cause => {
  if (cause == null) {
    throw new TypeError(
      `error(${cause}) is not allowed, consider passing an error instead`
    )
  } else {
    return { error: cause }
  }
}

/**
 * Crash the program with a given `message`. This function is
 * intended to be used in places where it is impossible to
 * recover from an error. It is similar to `panic` function in
 * Rust.
 *
 * @param {string} message
 */
export const panic = message => {
  throw new Failure(message)
}
/**
 * Creates the failing result containing an error with a given
 * `message`. Unlike `error` function it creates a very generic
 *  error with `message` & `stack` fields. The `error` function
 * is recommended over `fail` for all but the most basic use cases.
 *
 * @param {string} message
 * @returns {{error:API.Failure, ok?:undefined}}
 */
export const fail = message => ({ error: new Failure(message) })

/**
 * @implements {API.Failure}
 */
export class Failure extends Error {
  describe() {
    return this.toString()
  }
  get message() {
    return this.describe()
  }
  toJSON() {
    const { name, message, stack } = this
    return { name, message, stack }
  }
}

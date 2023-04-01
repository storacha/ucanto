import * as API from '@ucanto/interface'

/**
 * @template {{}|string|boolean|number} T
 * @param {T} value
 * @returns {{ok: T, value?:undefined}}
 */
export const ok = value => {
  if (value == null) {
    throw new TypeError(`ok(${value}) is not allowed, consider ok({}) instead`)
  } else {
    return { ok: value }
  }
}

/**
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

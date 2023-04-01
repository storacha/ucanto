import { Failure } from '../src/error.js'
import { ok, fail } from '@ucanto/core'
import * as API from '@ucanto/interface'

/**
 * @template T
 * @param {API.Result<T , API.Failure>} result
 * @returns {{error: API.Failure, ok?:undefined}|undefined}
 */
export const and = result => (result.error ? result : undefined)

/**
 * Check URI can be delegated
 *
 * @param {string|undefined} child
 * @param {string|undefined} parent
 * @returns {API.Result<{}, API.Failure>}
 */
export function canDelegateURI(child, parent) {
  if (parent === undefined) {
    return ok({})
  }

  if (child !== undefined && parent.endsWith('*')) {
    return child.startsWith(parent.slice(0, -1))
      ? ok({})
      : fail(`${child} does not match ${parent}`)
  }

  return child === parent
    ? ok({})
    : fail(`${child} is different from ${parent}`)
}

/**
 * @param {API.Link<unknown, number, number, 0|1>|undefined} child
 * @param {API.Link<unknown, number, number, 0|1>|undefined} parent
 */
export const canDelegateLink = (child, parent) => {
  // if parent poses no restriction it's can be derived
  if (parent === undefined) {
    return ok({})
  }

  return String(child) === parent.toString()
    ? ok({})
    : fail(`${child} is different from ${parent}`)
}

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {{can: API.Ability, with: string}} child
 * @param {{can: API.Ability, with: string}} parent
 */
export function equalWith(child, parent) {
  return child.with === parent.with
    ? ok({})
    : fail(`Can not derive ${child.can} with ${child.with} from ${parent.with}`)
}

import { Failure } from '../src/error.js'
import * as API from '@ucanto/interface'

/**
 * @param {API.Failure|true} value
 */
export const fail = value => (value === true ? undefined : value)

/**
 * Check URI can be delegated
 *
 * @param {string|undefined} child
 * @param {string|undefined} parent
 */
export function canDelegateURI(child, parent) {
  if (parent === undefined) {
    return true
  }

  if (child !== undefined && parent.endsWith('*')) {
    return child.startsWith(parent.slice(0, -1))
      ? true
      : new Failure(`${child} does not match ${parent}`)
  }

  return child === parent
    ? true
    : new Failure(`${child} is different from ${parent}`)
}

/**
 * @param {API.Link<unknown, number, number, 0|1>|undefined} child
 * @param {API.Link<unknown, number, number, 0|1>|undefined} parent
 */
export const canDelegateLink = (child, parent) => {
  // if parent poses no restriction it's can be derived
  if (parent === undefined) {
    return true
  }

  return String(child) === parent.toString()
    ? true
    : new Failure(`${child} is different from ${parent}`)
}

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {{can: API.Ability, with: string}} child
 * @param {{can: API.Ability, with: string}} parent
 */
export function equalWith(child, parent) {
  return (
    child.with === parent.with ||
    new Failure(
      `Can not derive ${child.can} with ${child.with} from ${parent.with}`
    )
  )
}

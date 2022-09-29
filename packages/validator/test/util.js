import { Failure } from '../src/error.js'
import * as API from '@ucanto/interface'

/**
 * @param {API.Failure|true} value
 */
export const fail = value => (value === true ? undefined : value)

/**
 * Check URI can be delegated
 *
 * @param {string} child
 * @param {string} parent
 */
export function canDelegateURI(child, parent) {
  if (parent.endsWith('*')) {
    return child.startsWith(parent.slice(0, -1))
      ? true
      : new Failure(`${child} does not match ${parent}`)
  }

  return child === parent
    ? true
    : new Failure(`${child} is different from ${parent}`)
}

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {API.ParsedCapability} child
 * @param {API.ParsedCapability} parent
 */
export function equalWith(child, parent) {
  return (
    child.with === parent.with ||
    new Failure(
      `Can not derive ${child.can} with ${child.with} from ${parent.with}`
    )
  )
}

import * as API from './types.js'
import { assert, use } from 'chai'
import subset from 'chai-subset'
use(subset)

export const test = it
export { assert }

/**
 * @template {API.Result} Result
 * @param {Result} result
 * @param {RegExp} pattern
 * @param {string} [message]
 */
export const matchError = (result, pattern, message) =>
  assert.match(`${result.error}`, pattern, message)

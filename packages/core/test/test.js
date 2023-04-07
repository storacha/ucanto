import { assert } from 'chai'

export const test = it

export { assert }

/**
 * @template {import('@ucanto/interface').Result} Result
 * @param {Result} result
 * @param {RegExp} pattern
 * @param {string} [message]
 */
export const matchError = (result, pattern, message) =>
  assert.match(`${result.error}`, pattern, message)

/**
 * @template {import('@ucanto/interface').Result} Result
 * @param {Result} result
 * @param {RegExp|Result} expect
 * @param {string} [message]
 */
export const matchResult = (result, expect, message) => {
  if (expect instanceof RegExp) {
    assert.match(`${result.error}`, expect, message)
  } else {
    assert.deepEqual(result, expect)
  }
}

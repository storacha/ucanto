import * as API from '@ucanto/interface'
import { Failure } from '../error.js'

/**
 * @param {unknown} input
 * @param {{pattern?: RegExp}} options
 * @return {API.Result<string, API.Failure>}
 */
export const decode = (input, { pattern } = {}) => {
  if (typeof input != 'string') {
    return new Failure(`Expected a string but got ${input} instead`)
  } else if (pattern && !pattern.test(input)) {
    return new Failure(`Expect to match ${pattern} but got "${input}" instead`)
  } else {
    return input
  }
}

/**
 * @param {{pattern?: RegExp}} options
 * @returns {API.Decoder<unknown, string, API.Failure>}
 */
export const match = (options = {}) => ({
  decode: input => decode(input, options),
})

/**
 * @param {{pattern?: RegExp}} options
 * @returns {API.Decoder<unknown, undefined|string, API.Failure>}
 */

export const optional = (options = {}) => ({
  decode: input => {
    if (input === undefined) {
      return undefined
    } else {
      return decode(input, options)
    }
  },
})

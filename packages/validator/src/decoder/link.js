import * as API from '@ucanto/interface'
import { Failure } from '../error.js'
import { create, createV0, isLink, asLink, parse } from '@ucanto/core/link'

export { create, createV0, isLink, asLink, parse }

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {unknown} input
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Result<API.Link<unknown, Code, Alg, Version>, API.Failure>}
 */
export const decode = (input, options = {}) => {
  if (input == null) {
    return new Failure(`Expected link but got ${input} instead`)
  } else {
    const cid = asLink(input)
    if (cid == null) {
      return new Failure(`Expected link to be a CID instead of ${input}`)
    } else {
      if (options.code != null && cid.code !== options.code) {
        return new Failure(
          `Expected link to be CID with 0x${options.code.toString(16)} codec`
        )
      }
      if (
        options.algorithm != null &&
        cid.multihash.code !== options.algorithm
      ) {
        return new Failure(
          `Expected link to be CID with 0x${options.algorithm.toString(
            16
          )} hashing algorithm`
        )
      }

      if (options.version != null && cid.version !== options.version) {
        return new Failure(
          `Expected link to be CID version ${options.version} instead of ${cid.version}`
        )
      }

      const link = /** @type {API.Link<unknown, Code, Alg, Version>} */ (cid)

      return link
    }
  }
}

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} options
 * @returns {API.Decoder<unknown,  API.Link<unknown, Code, Alg, Version>, API.Failure>}
 */

export const match = options => ({
  decode: input => decode(input, options),
})

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} options
 * @returns {API.Decoder<unknown, undefined|API.Link<unknown, Code, Alg, Version>, API.Failure>}
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

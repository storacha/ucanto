import * as API from '@ucanto/interface'
import { Failure } from '../error.js'
import { create, createLegacy, isLink, parse } from '@ucanto/core/link'

export { create, createLegacy, isLink, parse }

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {unknown} cid
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Result<API.Link<unknown, Code, Alg, Version>, API.Failure>}
 */
export const decode = (cid, options = {}) => {
  if (cid == null) {
    return new Failure(`Expected link but got ${cid} instead`)
  } else {
    if (!isLink(cid)) {
      return new Failure(`Expected link to be a CID instead of ${cid}`)
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

      // @ts-expect-error - inference can deduce version
      return cid
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

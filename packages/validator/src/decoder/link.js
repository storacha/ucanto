import * as API from "@ucanto/interface"
import { Failure } from "../error.js"
import { CID, digest } from "multiformats"
import { sha256 } from "multiformats/hashes/sha2"

/**
 * @template {number} Code
 * @template {number} Alg
 * @param {Code} code
 * @param {import('multiformats/hashes/interface').MultihashDigest<Alg>} digest
 * @return {API.Link<unknown, Code, Alg, 1> & CID}
 */
export const create = (code, digest) =>
  /** @type {any} */ (CID.createV1(code, digest))

/**
 * @template {number} Alg
 * @param {import('multiformats/hashes/interface').MultihashDigest<Alg>} digest
 * @return {API.Link<unknown, 0x70, Alg, 0>}
 */
export const createV0 = digest => /** @type {any} */ (CID.createV0(digest))

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {unknown} input
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Result<API.Link<unknown, Version, Code, Alg>, API.Failure>}
 */
export const decode = (input, options = {}) => {
  if (input == null) {
    return new Failure(`Expected link but got ${input} instead`)
  } else {
    const cid = CID.asCID(input)
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

      /** @type {API.Link<unknown, Version, Code, Alg>} */
      const link = /** @type {any} */ (cid)

      return link
    }
  }
}

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} options
 * @returns {API.Decoder<unknown,  API.Link<unknown, Version, Code, Alg>, API.Failure>}
 */

export const match = options => ({
  decode: input => decode(input, options),
})

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Decoder<unknown, undefined|API.Link<unknown, Version, Code, Alg>, API.Failure>}
 */
export const optional = options => ({
  decode: input => {
    if (input === undefined) {
      return undefined
    } else {
      return decode(input, options)
    }
  },
})

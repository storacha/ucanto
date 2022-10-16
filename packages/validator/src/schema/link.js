import * as API from '@ucanto/interface'
import { create, createLegacy, isLink, parse } from '@ucanto/core/link'
import * as Schema from './schema.js'

export { create, createLegacy, isLink, parse }

/**
 * @template {number} [Code=number]
 * @template {number} [Alg=number]
 * @template {1|0} [Version=0|1]
 * @typedef {{code?:Code, algorithm?:Alg, version?:Version}} Settings
 */

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @extends {Schema.API<API.Link<unknown, Code, Alg, Version>, unknown, Settings<Code, Alg, Version>>}
 */
class LinkSchema extends Schema.API {
  /**
   *
   * @param {unknown} cid
   * @param {Settings<Code, Alg, Version>} settings
   * @returns {Schema.ReadResult<API.Link<unknown, Code, Alg, Version>>}
   */
  readWith(cid, { code, algorithm, version }) {
    if (cid == null) {
      return Schema.error(`Expected link but got ${cid} instead`)
    } else {
      if (!isLink(cid)) {
        return Schema.error(`Expected link to be a CID instead of ${cid}`)
      } else {
        if (code != null && cid.code !== code) {
          return Schema.error(
            `Expected link to be CID with 0x${code.toString(16)} codec`
          )
        }
        if (algorithm != null && cid.multihash.code !== algorithm) {
          return Schema.error(
            `Expected link to be CID with 0x${algorithm.toString(
              16
            )} hashing algorithm`
          )
        }

        if (version != null && cid.version !== version) {
          return Schema.error(
            `Expected link to be CID version ${version} instead of ${cid.version}`
          )
        }

        // @ts-expect-error - can't infer version, code etc.
        return cid
      }
    }
  }
}

/** @type {Schema.Schema<API.Link<unknown, number, number, 0|1>, unknown>}  */
export const schema = new LinkSchema({})

export const link = () => schema

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {Settings<Code, Alg, Version>} options
 * @returns {Schema.Schema<API.Link<unknown, Code, Alg, Version>>}
 */
export const match = (options = {}) => new LinkSchema(options)

/**
 * @param {unknown} input
 */
export const read = input => schema.read(input)

export const optional = () => schema.optional()

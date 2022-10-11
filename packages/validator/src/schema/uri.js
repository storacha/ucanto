import * as API from '@ucanto/interface'
import * as Schema from './schema.js'

/**
 * @template {API.Protocol} P
 * @typedef {{protocol?: P}} Options
 */

/**
 * @template {API.Protocol} P
 * @extends {Schema.API<API.URI<P>, unknown, Options<P>>}
 */
class URISchema extends Schema.API {
  /**
   * @param {unknown} input
   * @param {{protocol?: P}} options
   */
  readWith(input, { protocol } = {}) {
    if (typeof input !== 'string' && !(input instanceof URL)) {
      return Schema.error(
        `Expected URI but got ${input === null ? 'null' : typeof input}`
      )
    }

    try {
      const url = new URL(String(input))
      if (protocol != null && url.protocol !== protocol) {
        return Schema.error(`Expected ${protocol} URI instead got ${url.href}`)
      } else {
        return /** @type {API.URI<P>} */ (url.href)
      }
    } catch (_) {
      return Schema.error(`Invalid URI`)
    }
  }
}

const schema = new URISchema({})

export const uri = () => schema

/**
 * @param {unknown} input
 */
export const read = input => schema.read(input)

/**
 * @template {API.Protocol} U
 * @param {Options<U>} options
 */
export const match = (options = {}) => new URISchema(options)

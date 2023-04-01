import * as API from '@ucanto/interface'
import * as Schema from './schema.js'

/**
 * @template {API.Protocol} [P=API.Protocol]
 * @typedef {{protocol: P}} Options
 */

/**
 * @template {Options} O
 * @extends {Schema.API<API.URI<O['protocol']>, unknown, Partial<O>>}
 */
class URISchema extends Schema.API {
  /**
   * @param {unknown} input
   * @param {Partial<O>} options
   * @returns {Schema.ReadResult<API.URI<O['protocol']>>}
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
        return { ok: /** @type {API.URI<O['protocol']>} */ (url.href) }
      }
    } catch (_) {
      return Schema.error(`Invalid URI`)
    }
  }
}

const schema = new URISchema({})

/**
 * @returns {Schema.Schema<API.URI, unknown>}
 */
export const uri = () => schema

/**
 * @param {unknown} input
 */
export const read = input => schema.read(input)

/**
 * @template {API.Protocol} P
 * @template {Options<P>} O
 * @param {O} options
 * @returns {Schema.Schema<API.URI<O['protocol']>, unknown>}
 */
export const match = options => new URISchema(options)

/**
 * @template {string} [Scheme=string]
 * @param {`${Scheme}:${string}`} input
 */
export const from = input =>
  /** @type {API.URI<`${Scheme}:`>} */ (schema.from(input))

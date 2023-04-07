import * as API from '@ucanto/interface'
import * as Schema from './schema.js'

/**
 * @template {string} Method
 * @extends {Schema.API<API.DID<Method> & API.URI<"did:">, string, void|Method>}
 */
class DIDSchema extends Schema.API {
  /**
   * @param {string} source
   * @param {void|Method} method
   */
  readWith(source, method) {
    const prefix = method ? `did:${method}:` : `did:`
    if (!source.startsWith(prefix)) {
      return Schema.error(`Expected a ${prefix} but got "${source}" instead`)
    } else {
      return { ok: /** @type {API.DID<Method>} */ (source) }
    }
  }
}

const schema = Schema.string().refine(new DIDSchema())

export const did = () => schema
/**
 *
 * @param {unknown} input
 */
export const read = input => schema.read(input)

/**
 * @template {string} Method
 * @param {{method?: Method}} options
 */
export const match = (options = {}) =>
  /** @type {Schema.Schema<API.DID<Method> & API.URI<"did:">>} */ (
    Schema.string().refine(new DIDSchema(options.method))
  )

/**
 * Create a DID string from any input (or throw)
 * @param {unknown} input
 */
export const from = input => match({}).from(input)

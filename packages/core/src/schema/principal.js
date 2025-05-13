import * as API from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'
import * as Schema from './schema.js'

/**
 * @template {string} Method
 * @extends {Schema.API<API.PrincipalView<API.DID<Method> & API.URI<"did:">>, unknown, void|Method>}
 */
class PrincipalSchema extends Schema.API {
  /**
   * @param {unknown} source
   * @param {void|Method} method
   */
  readWith(source, method) {
    if (!(source instanceof Uint8Array)) {
      return Schema.typeError({ expect: 'Uint8Array', actual: source })
    }
    let principal
    try {
      principal = DID.decode(source)
    } catch (err) {
      return Schema.error(`Unable to decode bytes as DID: ${err}`)
    }
    const prefix = method ? `did:${method}:` : `did:`
    if (!principal.did().startsWith(prefix)) {
      return Schema.error(
        `Expected a ${prefix} but got "${principal.did()}" instead`
      )
    }
    return { ok: /** @type {API.PrincipalView<API.DID<Method>>} */ (principal) }
  }
}

const schema = new PrincipalSchema()

/** A schema that reads byte encoded DIDs. */
export const principal = () => schema

/** @param {unknown} input */
export const read = input => schema.read(input)

/**
 * Matches a byte encoded DID.
 *
 * @template {string} Method
 * @param {{ method?: Method }} options
 */
export const match = (options = {}) =>
  /** @type {Schema.Schema<API.PrincipalView<API.DID<Method> & API.URI<"did:">>>} */
  (new PrincipalSchema(options.method))

/**
 * Create a Principal from any input (or throw).
 *
 * @param {unknown} input
 */
export const from = input => match({}).from(input)

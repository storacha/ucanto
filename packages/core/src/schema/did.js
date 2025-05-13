import * as API from '@ucanto/interface'
import * as Schema from './schema.js'
import * as DID from '@ipld/dag-ucan/did'
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

/**
 * @template {string} Method
 * @extends {Schema.API<API.DID<Method> & API.URI<"did:">, unknown, void|Method>}
 */
class DIDBytesSchema extends Schema.API {
  /**
   * @param {unknown} source
   * @param {void|Method} method
   */
  readWith(source, method) {
    if (!(source instanceof Uint8Array)) {
      return Schema.typeError({ expect: 'Uint8Array', actual: source })
    }
    let did
    try {
      did = DID.decode(source).did()
    } catch (err) {
      return Schema.error(`Unable to parse bytes as did: ${err}`)
    }
    const prefix = method ? `did:${method}:` : `did:`
    if (!did.startsWith(prefix)) {
      return Schema.error(`Expected a ${prefix} but got "${did}" instead`)
    } else {
      return { ok: /** @type {API.DID<Method>} */ (did) }
    } 
  }
}

const schemaBytes = new DIDBytesSchema()

/**
 * @deprecated Use `Schema.principal(...)` instead.
 */
export const didBytes = () => schemaBytes

/**
 * @deprecated Use `Schema.principal(...)` instead.
 * @param {unknown} input
 */
export const readBytes = input => schemaBytes.read(input)

/**
 * @deprecated Use `Schema.principal(...)` instead.
 * @template {string} Method
 * @param {{method?: Method}} options
 */
export const matchBytes = (options = {}) =>
  /** @type {Schema.Schema<API.DID<Method> & API.URI<"did:">>} */ (
    new DIDBytesSchema(options.method)
  )

/**
 * Create a DID string from any input (or throw)
 *
 * @deprecated Use `Schema.principal(...)` instead.
 * @param {unknown} input
 */
export const fromBytes = input => matchBytes({}).from(input)

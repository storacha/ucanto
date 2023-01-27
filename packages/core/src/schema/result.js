import * as API from '@ucanto/interface'
import * as Schema from './schema.js'
export const fail = Schema.struct({ error: true })

/**
 * Creates a schema for the task result by specifying ok and error types
 *
 * @template T
 * @template {{}} [X={message:string}]
 * @param {{ok: Schema.Reader<T>, error?: Schema.Reader<X>}} source
 * @returns {Schema.Schema<API.Result<T & {error?: undefined}, X & { error: true }>>}
 */
export const result = ({
  ok,
  error = Schema.struct({ message: Schema.string() }),
}) =>
  Schema.or(
    /** @type {Schema.Reader<T & {error?:never}>} */ (ok),
    fail.and(error)
  )

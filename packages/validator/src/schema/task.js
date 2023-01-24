import * as API from '@ucanto/interface'
import * as Schema from './schema.js'

/**
 * @template {API.URI} URI
 * @template {API.Ability} Ability
 * @template {{}} Caveats
 * @param {{with: Schema.Reader<URI>, can: Ability, nb: Schema.StructSchema<Caveats>}} source
 * @returns {{ can: Ability, schema: Schema.StructSchema<{with:Schema.Reader<URI>, can: Schema.Reader<Ability>, nb:Schema.StructSchema<Caveats>}>}}
 */
const capability = source => ({
  can: source.can,
  schema: Schema.struct({
    with: source.with,
    can: Schema.literal(source.can),
    nb: source.nb,
  }),
})

/**
 * @template {API.URI} URI
 * @template {API.Ability} Ability
 * @template {{}} Caveats
 */
class Capability {
  /**
   * @param {{with: Schema.Reader<URI>, can: Ability, nb: Schema.StructSchema<Caveats>}} source
   */
  constructor(source) {
    this.can = source.can
    this.schema = Schema.struct({
      with: source.with,
      can: Schema.literal(source.can),
      nb: source.nb,
    })
  }
}

/**
 * @template {{}} In
 * @template {unknown} Out
 * @template {{error: true}} Error
 * @param {{in: API.Reader<In, unknown>, out: API.Reader<API.Result<Out, Error>, unknown>}} options
 */
export const task = options => ({ ...options })

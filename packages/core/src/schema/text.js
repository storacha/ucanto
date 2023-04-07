import * as Schema from './schema.js'

const schema = Schema.string()

/**
 * @param {{pattern: RegExp}} [options]
 */
export const match = options =>
  options ? schema.refine(new Match(options.pattern)) : schema

export const text = match

/**
 * @param {unknown} input
 */
export const read = input => schema.read(input)

/**
 * @extends {Schema.API<string, string, RegExp>}
 */
class Match extends Schema.API {
  /**
   * @param {string} source
   * @param {RegExp} pattern
   */
  readWith(source, pattern) {
    if (!pattern.test(source)) {
      return Schema.error(
        `Expected to match ${pattern} but got "${source}" instead`
      )
    } else {
      return { ok: source }
    }
  }
}

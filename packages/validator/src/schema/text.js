import * as Schema from './schema.js'

const schema = Schema.string()

export const text = () => Text

/**
 * @param {{pattern: RegExp}} options
 */
export const match = ({ pattern }) => schema.refine(new Match(pattern))

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
      return source
    }
  }
}

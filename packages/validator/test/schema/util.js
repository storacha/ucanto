/**
 * @typedef {{error?:undefined, value:unknown}|{error:RegExp}} Expect
 * @param {unknown} [value]
 * @return {Expect}
 */
export const pass = value => ({ value })

export const fail = Object.assign(
  /**
   * @param {object} options
   * @param {unknown} [options.got]
   * @param {string} [options.expect]
   */
  ({ got = '.*', expect = '.*' }) => ({
    error: new RegExp(`expect.*${expect}.* got ${got}`, 'is'),
  }),
  {
    /**
     * @param {string} pattern
     */
    as: pattern => ({
      error: new RegExp(pattern, 'is'),
    }),
    /**
     * @param {number|string} at
     * @param {object} options
     * @param {unknown} [options.got]
     * @param {unknown} [options.expect]
     */
    at: (at, { got = '.*', expect = [] }) => {
      const variants = Array.isArray(expect)
        ? expect.join(`.* expect.*`)
        : expect
      return {
        error: new RegExp(
          `invalid .* ${at}.* expect.*${variants} .* got ${got}`,
          'is'
        ),
      }
    },
  }
)

/**
 * @param {unknown} source
 * @returns {string}
 */
export const display = source => {
  const type = typeof source
  switch (type) {
    case 'boolean':
    case 'string':
      return JSON.stringify(source)
    // if these types we do not want JSON.stringify as it may mess things up
    // eg turn NaN and Infinity to null
    case 'bigint':
    case 'number':
    case 'symbol':
    case 'undefined':
      return String(source)
    case 'object': {
      if (source === null) {
        return 'null'
      }

      if (Array.isArray(source)) {
        return `[${source.map(display).join(', ')}]`
      }

      return `{${Object.entries(Object(source)).map(
        ([key, value]) => `${key}:${display(value)}`
      )}}`
    }
    default:
      return String(source)
  }
}

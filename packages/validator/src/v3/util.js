/**
 *
 * @template {{}} O
 * @param {O} object
 * @returns {{ [K in keyof O]: [K, O[K]][] }[keyof O]}
 */

export const entries = object => /** @type {any} */ (Object.entries(object))

/**
 * @template T
 * @param {T[][]} dataset
 * @returns {T[][]}
 */
export const combine = ([first, ...rest]) => {
  const results = first.map(value => [value])
  for (const values of rest) {
    const tuples = results.splice(0)
    for (const value of values) {
      for (const tuple of tuples) {
        results.push([...tuple, value])
      }
    }
  }
  return results
}

/**
 * @template {string|boolean|number|[unknown, ...unknown[]]} T
 * @param {T} value
 * @returns {T}
 */
export const the = value => value

/**
 * @template {{}} O
 * @param {O} object
 * @returns {({ [K in keyof O]: [K, O[K]][] }[keyof O])|[[never, never]]}
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

/**
 * @template T
 * @param {T[]} left
 * @param {T[]} right
 * @returns {T[]}
 */
export const intersection = (left, right) => {
  const [result, other] =
    left.length < right.length
      ? [new Set(left), new Set(right)]
      : [new Set(right), new Set(left)]

  for (const item of result) {
    if (!other.has(item)) {
      result.delete(item)
    }
  }

  return [...result]
}

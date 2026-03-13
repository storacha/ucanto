/**
 * @template T
 * @param {AsyncIterable<T>|Iterable<T>} iterable
 * @returns {Promise<T[]>}
 */
export const collect = async iterable => {
  const result = []
  for await (const item of iterable) {
    result.push(item)
  }
  return result
}

import * as API from '../api.js'

/**
 * @template T
 * @param {API.ConnectionOptions} options
 * @returns {API.Connection<T>}
 */
export const open = (options) => new Connection(options)

/**
 * @template T
 * @implements {API.Connection<T>}
 */
class Connection {
  /**
   * @param {API.ConnectionOptions} options
   */
  constructor(options) {
    this.options = options
  }
  get codec() {
    return this.options.codec
  }
}

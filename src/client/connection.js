import * as API from "../api.js"

/**
 * Creates a connection to a service.
 *
 * @template T
 * @param {API.ConnectionOptions} options
 * @returns {API.ConnectionView<T>}
 */
export const connect = options => new Connection(options)

/**
 * @template T
 * @implements {API.ConnectionView<T>}
 */
class Connection {
  /**
   * @param {API.ConnectionOptions} options
   */
  constructor(options) {
    this.options = options
    this.encode = options.codec.encode
    this.decode = options.codec.decode
    this.hasher = options.hasher
  }
  get codec() {
    return this.options.codec
  }
}

import * as API from "@ucanto/interface"
import { sha256 } from "multiformats/hashes/sha2"

/**
 * Creates a connection to a service.
 *
 * @template T
 * @param {API.ConnectionOptions<T>} options
 * @returns {API.ConnectionView<T>}
 */
export const connect = options => new Connection(options)

/**
 * @template T
 * @implements {API.ConnectionView<T>}
 */
class Connection {
  /**
   * @param {API.ConnectionOptions<T>} options
   */
  constructor(options) {
    this.options = options
    this.encoder = options.encoder
    this.decoder = options.decoder
    this.channel = options.channel
    this.hasher = options.hasher || sha256
  }
}

import * as API from '@ucanto/interface'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * Creates a connection to a service.
 *
 * @template T
 * @param {API.ConnectionOptions<T>} options
 * @returns {API.ConnectionView<T>}
 */
export const connect = (options) => new Connection(options)

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
  /**
   * @template {API.Capability} C
   * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
   * @param {I} invocations
   */
  execute(...invocations) {
    return execute(invocations, this)
  }
}

/**
 * @template {API.Capability} C
 * @template T
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @param {API.Connection<T>} connection
 * @param {I} invocations
 * @returns {Promise<API.InferServiceInvocations<I, T>>}
 */
export const execute = async (invocations, connection) => {
  const request = await connection.encoder.encode(invocations, connection)
  const response = await connection.channel.request(request)
  const result = await connection.decoder.decode(response)
  return result
}

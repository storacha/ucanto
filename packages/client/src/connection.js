import * as API from '@ucanto/interface'
import { Receipt, Signature, sha256 } from '@ucanto/core'

/**
 * Creates a connection to a service.
 *
 * @template {Record<string, any>} T
 * @param {API.ConnectionOptions<T>} options
 * @returns {API.ConnectionView<T>}
 */
export const connect = options => new Connection(options)

/**
 * @template {Record<string, any>} T
 * @implements {API.ConnectionView<T>}
 */
class Connection {
  /**
   * @param {API.ConnectionOptions<T>} options
   */
  constructor(options) {
    this.id = options.id
    this.options = options
    this.codec = options.codec
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
 * @template {Record<string, any>} T
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @param {API.Connection<T>} connection
 * @param {I} workflow
 * @returns {Promise<API.InferWorkflowReceipts<I, T>>}
 */
export const execute = async (workflow, connection) => {
  const request = await connection.codec.encode(workflow, connection)
  const response = await connection.channel.request(request)
  try {
    return await connection.codec.decode(response)
  } catch (error) {
    const { message, ...cause } = /** @type {Error} */ (error)
    const receipts = []
    for await (const invocation of workflow) {
      const { cid } = await invocation.delegate()
      const receipt = await Receipt.issue({
        ran: cid,
        result: { error: { ...cause, message } },
        // @ts-expect-error
        issuer: {
          did() {
            return connection.id.did()
          },
          sign(payload) {
            return Signature.createNonStandard('', new Uint8Array())
          },
        },
      })

      receipts.push(receipt)
    }

    return /** @type {any} */ (receipts)
  }
}

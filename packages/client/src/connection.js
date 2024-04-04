import * as API from '@ucanto/interface'
import { Signature, Message, Receipt, sha256 } from '@ucanto/core'

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
   * Execute invocations.
   *
   * @template {API.Capability} C
   * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
   * @param {I} invocations
   * @returns {Promise<API.InferReceipts<I, T>>}
   */
  async execute(...invocations) {
    return execute(invocations, this)
  }
}

/**
 * @template {API.Capability} C
 * @template {Record<string, any>} T
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @param {API.Connection<T>} connection
 * @param {I} invocations
 * @returns {Promise<API.InferReceipts<I, T>>}
 */
export const execute = async (invocations, connection) => {
  const input = await Message.build({ invocations })
  const request = await connection.codec.encode(input, connection)
  const response = await connection.channel.request(request)
  // We may fail to decode the response if content type is not supported
  // or if data was corrupted. We do not want to throw in such case however,
  // because client will get an Error object as opposed to a receipt, to retain
  // consistent client API with two kinds of errors we encode caught error as
  // a receipts per workflow invocation.
  try {
    const output = await connection.codec.decode(response)
    const receipts = input.invocationLinks.map(link => output.get(link))
    return /** @type {API.InferReceipts<I, T>} */ (receipts)
  } catch (error) {
    // No third party code is run during decode and we know
    // we only throw an Error
    const { message, name = 'Error', ...cause } = /** @type {Error} */ (error)
    const receipts = []
    for await (const ran of input.invocationLinks) {
      const receipt = await Receipt.issue({
        ran,
        result: { error: { ...cause, name, message } },
        // @ts-expect-error - we can not really sign a receipt without having
        // an access to a signer which client does not have. In the future
        // we will change client API requiring a signer to be passed in but
        // for now we just use a dummy signer.
        issuer: {
          did() {
            return connection.id.did()
          },
          sign() {
            return Signature.createNonStandard('', new Uint8Array())
          },
        },
      })

      receipts.push(receipt)
    }

    return /** @type {API.InferReceipts<I, T>} */ (receipts)
  }
}

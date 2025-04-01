import * as API from '@ucanto/interface'
import { Verifier } from '@ucanto/principal'
export { capability, URI, Link, Failure } from '@ucanto/validator'
import { Receipt, Message, fail } from '@ucanto/core'
import {
  HandlerExecutionError,
  HandlerNotFound,
  InvocationCapabilityError,
} from './error.js'
export { ok, error } from './handler.js'
export { fail }
/**
 * Creates a connection to a service.
 *
 * @template {Record<string, any>} Service
 * @param {API.ServerOptions<Service>} options
 * @returns {API.ServerView<Service>}
 */
export const create = options => new Server(options)

/**
 * @template {Record<string, any>} S
 * @implements {API.ServerView<S>}
 */
class Server {
  /**
   * @param {API.ServerOptions<S>} options
   */
  constructor({ id, service, codec, principal = Verifier, ...rest }) {
    const { catch: fail, ...context } = rest
    this.context = { id, principal, ...context }
    this.service = service
    this.codec = codec
    this.catch = fail || (() => {})
    this.validateAuthorization = this.context.validateAuthorization.bind(
      this.context
    )
  }
  get id() {
    return this.context.id
  }

  /**
   * @template {API.Tuple<API.ServiceInvocation<API.Capability, S>>} I
   * @param {API.HTTPRequest<API.AgentMessage<{ In: API.InferInvocations<I>, Out: API.Tuple<API.Receipt> }>>} request
   * @returns {Promise<API.HTTPResponse<API.AgentMessage<{ Out: API.InferReceipts<I, S>, In: API.Tuple<API.Invocation> }>>>}
   */
  request(request) {
    return handle(this, request)
  }

  /**
   * @template {API.Capability} C
   * @param {API.ServiceInvocation<C, S>} invocation
   * @returns {Promise<API.InferReceipt<C, S>>}
   */
  async run(invocation) {
    const receipt = /** @type {API.InferReceipt<C, S>} */ (
      await invoke(await invocation.buildIPLDView(), this)
    )
    return receipt
  }
}

/**
 * @template {Record<string, any>} S
 * @template {API.Tuple<API.ServiceInvocation<API.Capability, S>>} I
 * @param {API.Server<S>} server
 * @param {API.HTTPRequest<API.AgentMessage<{ In: API.InferInvocations<I>, Out: API.Tuple<API.Receipt> }>>} request
 */
export const handle = async (server, request) => {
  const selection = server.codec.accept(request)
  if (selection.error) {
    const { status, headers = {}, message } = selection.error
    return {
      status,
      headers,
      body: new TextEncoder().encode(message),
    }
  } else {
    const { encoder, decoder } = selection.ok
    try {
      const message = await decoder.decode(request)
      const result = await execute(message, server)
      const response = await encoder.encode(result)
      return response
    } catch (/** @type {Error} */ err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to decode request'
      return {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: new TextEncoder().encode(`Bad request: Malformed payload - ${errorMessage}`),
      }
    }
  }
}

/**
 * @template {Record<string, any>} S
 * @template {API.Tuple} I
 * @param {API.AgentMessage<{ In: API.InferInvocations<I>, Out: API.Tuple<API.Receipt> }>} input
 * @param {API.Server<S>} server
 * @returns {Promise<API.AgentMessage<{ Out: API.InferReceipts<I, S>, In: API.Tuple<API.Invocation> }>>}
 */
export const execute = async (input, server) => {
  const promises = input.invocations.map($ => run($, server))

  const receipts = /** @type {API.InferReceipts<I, S>} */ (
    await Promise.all(promises)
  )

  return Message.build({ receipts })
}

/**
 * Executes a single invocation and returns a receipt.
 *
 * @template {Record<string, any>} Service
 * @template {API.Capability} C
 * @param {API.Invocation<C>} invocation
 * @param {API.Server<Service>} server
 * @returns {Promise<API.Receipt>}
 */
export const run = async (invocation, server) => {
  // Invocation needs to have one single capability
  if (invocation.capabilities.length !== 1) {
    return await Receipt.issue({
      issuer: server.id,
      ran: invocation,
      result: {
        error: new InvocationCapabilityError(invocation.capabilities),
      },
    })
  }

  const [capability] = invocation.capabilities

  const path = capability.can.split('/')
  const method = /** @type {string} */ (path.pop())
  const handler = resolve(server.service, path)
  if (handler == null || typeof handler[method] !== 'function') {
    return await Receipt.issue({
      issuer: server.id,
      ran: invocation,
      result: {
        /** @type {API.HandlerNotFound} */
        error: new HandlerNotFound(capability),
      },
    })
  } else {
    try {
      const outcome = await handler[method](invocation, server.context)
      const result = outcome.do ? outcome.do.out : outcome
      const fx = outcome.do ? outcome.do.fx : undefined

      return await Receipt.issue({
        issuer: server.id,
        ran: invocation,
        result,
        fx,
      })
    } catch (cause) {
      /** @type {API.HandlerExecutionError} */
      const error = new HandlerExecutionError(
        capability,
        /** @type {Error} */ (cause)
      )

      server.catch(error)

      return await Receipt.issue({
        issuer: server.id,
        ran: invocation,
        result: { error },
      })
    }
  }
}

/**
 * @deprecated Use `run` instead.
 */
export const invoke = run

/**
 * @param {Record<string, any>} service
 * @param {string[]} path
 * @returns {null|Record<string, API.ServiceMethod<API.Capability, {}, API.Failure>>}
 */

export const resolve = (service, path) => {
  let target = service
  for (const key of path) {
    target = target[key]
    if (!target) {
      return null
    }
  }
  return target
}
import * as API from '@ucanto/interface'
import { Verifier } from '@ucanto/principal'
export {
  capability,
  URI,
  Link,
  Failure,
  MalformedCapability,
} from '@ucanto/validator'
import { Receipt } from '@ucanto/core'

/**
 * Creates a connection to a service.
 *
 * @template {Record<string, any>} Service
 * @param {API.Server<Service>} options
 * @returns {API.ServerView<Service>}
 */
export const create = options => new Server(options)

/**
 * @template {Record<string, any>} Service
 * @implements {API.ServerView<Service>}
 */
class Server {
  /**
   * @param {API.Server<Service>} options
   */
  constructor({ id, service, codec, principal = Verifier, ...rest }) {
    const { catch: fail, ...context } = rest
    this.context = { id, principal, ...context }
    this.service = service
    this.codec = codec
    this.catch = fail || (() => {})
  }
  get id() {
    return this.context.id
  }

  /**
   * @type {API.Channel<Service>['request']}
   */
  request(request) {
    return handle(this, request)
  }
}

/**
 * @template {Record<string, any>} T
 * @template {API.Tuple<API.ServiceInvocation<API.Capability, T>>} I
 * @param {API.ServerView<T>} server
 * @param {API.HTTPRequest<I>} request
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
    const workflow = await decoder.decode(request)
    const result = await execute(workflow, server)
    const response = await encoder.encode(result)
    return response
  }
}

/**
 * @template {Record<string, any>} Service
 * @template {API.Capability} C
 * @template {API.Tuple<API.ServiceInvocation<C, Service>>} I
 * @param {API.InferInvocations<I>} workflow
 * @param {API.ServerView<Service>} server
 * @returns {Promise<API.InferWorkflowReceipts<I, Service> & API.Tuple<API.Receipt>>}
 */
export const execute = async (workflow, server) => {
  const input =
    /** @type {API.InferInvocation<API.ServiceInvocation<C, Service>>[]} */ (
      workflow
    )

  const promises = input.map(invocation => invoke(invocation, server))
  const results = await Promise.all(promises)

  return /** @type {API.InferWorkflowReceipts<I, Service> & API.Tuple<API.Receipt>} */ (
    results
  )
}

/**
 * @template {Record<string, any>} Service
 * @template {API.Capability} C
 * @param {API.InferInvocation<API.ServiceInvocation<C, Service>>} invocation
 * @param {API.ServerView<Service>} server
 * @returns {Promise<API.Receipt>}
 */
export const invoke = async (invocation, server) => {
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
      const value = await handler[method](invocation, server.context)
      return await Receipt.issue({
        issuer: server.id,
        ran: invocation,
        result: /** @type {API.ReceiptResult<{}>} */ (
          value?.error ? { error: value } : { ok: value || {} }
        ),
      })
    } catch (cause) {
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
 * @implements {API.HandlerNotFound}
 */
export class HandlerNotFound extends RangeError {
  /**
   * @param {API.Capability} capability
   */
  constructor(capability) {
    super()
    /** @type {true} */
    this.error = true
    this.capability = capability
  }
  /** @type {'HandlerNotFound'} */
  get name() {
    return 'HandlerNotFound'
  }
  get message() {
    return `service does not implement {can: "${this.capability.can}"} handler`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      capability: {
        can: this.capability.can,
        with: this.capability.with,
      },
      message: this.message,
      stack: this.stack,
    }
  }
}

class HandlerExecutionError extends Error {
  /**
   * @param {API.ParsedCapability} capability
   * @param {Error} cause
   */
  constructor(capability, cause) {
    super()
    this.capability = capability
    this.cause = cause
    /** @type { true } */
    this.error = true
  }

  /** @type {'HandlerExecutionError'} */
  get name() {
    return 'HandlerExecutionError'
  }
  get message() {
    return `service handler {can: "${this.capability.can}"} error: ${this.cause.message}`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      capability: {
        can: this.capability.can,
        with: this.capability.with,
      },
      cause: {
        ...this.cause,
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      },
      message: this.message,
      stack: this.stack,
    }
  }
}

class InvocationCapabilityError extends Error {
  /**
   * @param {any} caps
   */
  constructor(caps) {
    super()
    /** @type {true} */
    this.error = true
    this.caps = caps
  }
  get name() {
    return 'InvocationCapabilityError'
  }
  get message() {
    return `Invocation is required to have a single capability.`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      message: this.message,
      capabilities: this.caps,
    }
  }
}

/**
 * @param {Record<string, any>} service
 * @param {string[]} path
 */

const resolve = (service, path) => {
  let target = service
  for (const key of path) {
    target = target[key]
    if (!target) {
      return null
    }
  }
  return target
}

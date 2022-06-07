import * as API from "@ucanto/interface"
export * from "@ucanto/interface"

/**
 * Creates a connection to a service.
 *
 * @template Service
 * @param {API.Server<Service>} options
 * @returns {API.ServerView<Service>}
 */
export const create = options => new Server(options)

/**
 * @template Service
 * @implements {API.ServerView<Service>}
 */
class Server {
  /**
   * @param {API.Server<Service>} options
   */
  constructor(options) {
    this.options = options
    this.decoder = options.decoder
    this.encoder = options.encoder
    this.service = options.service
  }
  /**
   * @template {API.Capability} C
   * @template {API.Tuple<API.ServiceInvocation<C, Service>>} I
   * @param {API.HTTPRequest<I>} request
   * @returns {API.Await<API.HTTPResponse<API.InferServiceInvocations<I, Service>>>}
   */
  request(request) {
    return handle(/** @type {API.ServerView<Service>} */ (this), request)
  }
}

/**
 * @template T
 * @template {API.Capability} C
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @param {API.ServerView<T>} handler
 * @param {API.HTTPRequest<I>} request
 * @returns {Promise<API.HTTPResponse<API.InferServiceInvocations<I, T>>>}
 */
export const handle = async (handler, request) => {
  const invocations = await handler.decoder.decode(request)
  const result = await execute(invocations, handler)
  return handler.encoder.encode(result)
}

/**
 * @template Service
 * @template {API.Capability} C
 * @template {API.Tuple<API.ServiceInvocation<C, Service>>} I
 * @param {API.InferInvocations<I>} invocations
 * @param {API.ServerView<Service>} handler
 * @returns {Promise<API.InferServiceInvocations<I, Service>>}
 */
export const execute = async (invocations, { service }) => {
  const results = []
  const input =
    /** @type {API.InferInvocation<API.ServiceInvocation<C, Service>>[]} */ (
      invocations
    )
  for (const invocation of input) {
    results.push(await invoke(invocation, service))
  }

  return /** @type {API.InferServiceInvocations<I, Service>} */ (results)
}

/**
 * @template Service
 * @template {API.Capability} C
 * @param {API.InferInvocation<API.ServiceInvocation<C, Service>>} invocation
 * @param {Service} service
 * @returns {Promise<API.InferServiceInvocationReturn<C, Service>>}
 */
export const invoke = async (invocation, service) => {
  const [capability] = invocation.capabilities
  const path = capability.can.split("/")
  const method = /** @type {string} */ (path.pop())
  const handler = resolve(service, path)
  if (handler == null || typeof handler[method] !== "function") {
    return /** @type {API.Result<any, API.HandlerNotFound>} */ (
      new HandlerNotFound(capability)
    )
  } else {
    try {
      return await handler[method](invocation)
    } catch (error) {
      return /** @type {API.Result<any, API.HandlerExecutionError>} */ (
        new HandlerExecutionError(
          /** @type {API.Result<any, API.HandlerNotFound>} */
          capability,
          /** @type {Error} */ (error)
        )
      )
    }
  }
}

/**
 * @implements {API.HandlerNotFound}
 */
class HandlerNotFound extends RangeError {
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
    return "HandlerNotFound"
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
   * @param {API.Capability} capability
   * @param {Error} cause
   */
  constructor(capability, cause) {
    super()
    this.capability = capability
    this.cause = cause
    this.error = true
  }
  get name() {
    return "HandlerExecutionError"
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

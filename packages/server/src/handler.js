import * as API from './api.js'
import { access } from '@ucanto/validator'

/**
 * @template {API.ParsedCapability} T
 * @template {unknown} U
 * @param {API.CapabilityParser<API.Match<T>>} capability
 * @param {(input:API.ProviderInput<T>) => API.Await<U>} handler
 * @returns {API.ServiceMethod<API.Capability<T['can'], T['with']> & T['caveats'], Exclude<U, {error:true}>, Exclude<U, Exclude<U, {error:true}>>>}
 */

export const provide =
  (capability, handler) =>
  /**
   * @param {API.Invocation<API.Capability<T['can'], T['with']> & T['caveats']>} invocation
   * @param {API.InvocationContext} options
   */
  async (invocation, options) => {
    const authorization = await access(invocation, {
      ...options,
      capability,
    })
    if (authorization.error) {
      return authorization
    } else {
      return /** @type {API.Result<Exclude<U, {error:true}>, {error:true} & Exclude<U, Exclude<U, {error:true}>>|API.InvocationError>} */ (
        handler({
          capability: authorization.capability,
          invocation,
          context: options,
        })
      )
    }
  }

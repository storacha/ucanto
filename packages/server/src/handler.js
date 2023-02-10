import * as API from './api.js'
import { access } from '@ucanto/validator'

/**
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @template {unknown} U
 * @param {API.CapabilityParser<API.Match<API.ParsedCapability<A, R, C>>>} capability
 * @param {(input:API.ProviderInput<API.ParsedCapability<A, R, C>>) => API.Await<U>} handler
 * @returns {API.ServiceMethod<API.Capability<A, R, C>, Exclude<U, {error:true}>, Exclude<U, Exclude<U, {error:true}>>>}
 */

export const provide =
  (capability, handler) =>
  /**
   * @param {API.Invocation<API.Capability<A, R, C>>} invocation
   * @param {API.InvocationContext} options
   */
  async (invocation, options) => {
    const authorization = await access(invocation, {
      ...options,
      authority: options.id,
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

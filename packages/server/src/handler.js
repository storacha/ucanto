import * as API from "./api.js"
import { access } from "@ucanto/validator"

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @template {API.Resource} R
 * @template {unknown} U
 * @param {API.TheCapabilityParser<API.CapabilityMatch<A, C>>} capability
 * @param {(input:API.ProviderContext<A, R, C>) => API.Await<U>} handler
 * @returns {API.ServiceMethod<API.Capability<A, R> & API.InferCaveats<C>, Exclude<U, {error:true}>, Exclude<U, Exclude<U, {error:true}>>>}
 */

export const provide =
  (capability, handler) =>
  /**
   * @param {API.Invocation<API.Capability<A, R> & API.InferCaveats<C>>} invocation
   * @param {API.InvocationContext} options
   * @return {Promise<API.Result<Exclude<U, {error:true}>, Exclude<U, Exclude<U, {error:true}>>|API.InvocationError>>}
   */
  async (invocation, options) => {
    const authorization = await access(invocation, { ...options, capability })
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

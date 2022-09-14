import * as API from '@ucanto/interface'
import { InferCaveats, CanIssue, ParsedCapability } from '@ucanto/interface'

export * from '@ucanto/interface'

export type InvocationError =
  | API.HandlerNotFound
  | API.HandlerExecutionError
  | API.InvalidAudience
  | API.Unauthorized

export interface ProviderOptions extends CanIssue {
  my?: (issuer: API.DID) => API.Capability[]
  resolve?: (
    proof: API.Link
  ) => API.Await<API.Result<API.Delegation, API.UnavailableProof>>

  principal: API.PrincipalParser
}

export interface ProviderContext<
  A extends API.Ability = API.Ability,
  R extends API.URI = API.URI,
  C extends API.Caveats = API.Caveats
> {
  capability: API.ParsedCapability<A, R, API.InferCaveats<C>>
  invocation: API.Invocation<API.Capability<A, R['href']> & API.InferCaveats<C>>

  context: API.InvocationContext
}

export interface ProviderInput<T extends ParsedCapability> {
  capability: T
  invocation: API.Invocation<API.Capability<T['can'], T['with']> & T['caveats']>

  context: API.InvocationContext
}

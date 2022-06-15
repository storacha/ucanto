import * as API from "@ucanto/interface"
import { InferCaveats, CanIssue } from "@ucanto/interface"

export * from "@ucanto/interface"

export type InvocationError =
  | API.HandlerNotFound
  | API.HandlerExecutionError
  | API.InvalidAudience
  | API.Unauthorized

export interface ProviderOptions extends CanIssue {
  my?: (issuer: API.DID) => API.Capability[]
  resolve?: (
    proof: API.LinkedProof
  ) => API.Await<API.Result<API.Delegation, API.UnavailableProof>>

  authority: API.AuthorityParser
}

export interface ProviderContext<
  A extends API.Ability = API.Ability,
  R extends API.Resource = API.Resource,
  C extends API.Caveats = API.Caveats
> {
  capability: API.ParsedCapability<A, API.InferCaveats<C>>
  invocation: API.Invocation<API.Capability<A, R>>

  context: API.InvocationContext
}

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

// export interface Provider<R extends Route<any, any, any, any> = never> {
//   execute: R["execute"]

//   or<K extends Route<any, any, any, any>>(other: Provider<K>): Provider<R & K>
// }

// interface Route<
//   A extends API.Ability,
//   C extends API.Caveats,
//   O extends unknown,
//   X extends { error: true }
// > {
//   readonly can: A
//   readonly capability: API.CapabilityParser<
//     API.Match<API.ParsedCapability<A, API.InferCaveats<C>>>
//   >
//   readonly execute: (
//     capability: API.ParsedCapability<A, API.InferCaveats<C>>,
//     options: API.ValidationOptions<API.ParsedCapability<A, API.InferCaveats<C>>>
//   ) => API.Await<API.Result<O, X | API.Unauthorized>>
// }

// export type InferParsedCapability<R extends Route> = R extends Route<
//   infer A,
//   infer C
// >
//   ? API.ParsedCapability<A, InferCaveats<C>>
//   : never

// export type InferInvocation<R extends Route> = R extends Route<infer A>
//   ? API.Invocation<API.Capability<A>>
//   : never

// export type InferReturn<R extends Route> = R extends Route<
//   API.Ability,
//   API.Caveats,
//   infer O,
//   infer X
// >
//   ? API.Await<API.Result<O, X | InvocationError>>
//   : never

// export interface Route<
//   A extends API.Ability = API.Ability,
//   C extends API.Caveats = API.Caveats,
//   O extends unknown = unknown,
//   X extends { error: true } = { error: true }
// > {
//   can: A
//   execute: (
//     invocation: API.Invocation<API.Capability<A>>,
//     options: API.ValidationOptions<API.ParsedCapability<A, InferCaveats<C>>>
//   ) => API.Await<API.Result<O, X | InvocationError>>
// }

// // export type Provider<
// //   I extends API.Capability = API.Capability,
// //   O extends unknown = unknown,
// //   X extends { error: true } = API.Failure
// // > = {
// //   [K in I["can"]]: (
// //     invocation: API.Invocation<I>
// //   ) => API.Await<API.Result<O, X | API.Unauthorized>>
// // }

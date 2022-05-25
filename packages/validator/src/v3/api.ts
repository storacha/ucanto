export * from "../api.js"
import * as API from "../api.js"

import type { Capability as Source } from "../api.js"
export type {
  Capability as Source,
  Ability,
  Resource,
  EscalatedClaim as EscalatedCapability,
} from "../api.js"
import type { EscalatedClaim as EscalatedCapability } from "../api.js"

export interface Match<T = unknown, M extends Match = Match<unknown, any>>
  extends Selector<M> {
  value: T
}

export interface Matcher<M extends Match> {
  match(capability: Source): MatchResult<M>
}

export interface Selector<M extends Match> {
  select(capabilites: Source[]): M[]
}

export interface MatchSelector<M extends Match>
  extends Matcher<M>,
    Selector<M> {}

export interface DirectMatch<T> extends Match<T, DirectMatch<T>> {}

export interface Parser<
  I,
  O extends NonNullable<unknown>,
  X extends { error: Error }
> {
  (input: I): API.Result<O, X>
}

export interface Failure extends Error {
  error: this
  describe(): string
}

export interface Caveats
  extends Record<string, Parser<unknown, unknown, Failure>> {}

export interface Descriptor<T extends ParsedCapability, M extends Match> {
  can: T["can"]
  with: Parser<string, T["with"], Failure>
  caveats?: InferCaveatsDescriptor<T>
  derives: (
    claim: T,
    capability: M["value"]
  ) => API.Result<T, EscalatedCapability<T>>
}

export type MatchResult<M extends Match> = API.Result<
  M,
  API.InvalidCapability | EscalatedCapability<M["value"]>
>

export interface Config<
  Ability extends API.Ability,
  Constraints extends Caveats,
  M extends Match
> extends Descriptor<ParsedCapability<Ability, Constraints>, M> {}

export type InferCaveatsDescriptor<T extends ParsedCapability> = {
  [Key in keyof T["caveats"]]: T["caveats"][Key] extends infer U
    ? Parser<unknown, T["caveats"][Key], Failure>
    : never
}

export interface DerivedMatch<T, M extends Match>
  extends Match<T, M | DerivedMatch<T, M>> {}

export interface DeriveSelector<M extends Match, T> {
  to: MatchSelector<DirectMatch<T>>
  derives: (self: T, from: M["value"]) => boolean
}

export interface Derives<T, U> {
  (self: T, from: U): boolean
}

export interface View<M extends Match> extends Matcher<M>, Selector<M> {
  or<W extends Match>(other: MatchSelector<W>): MatchSelector<M | W>
  derive<T>(options: DeriveSelector<M, T>): MatchSelector<DerivedMatch<T, M>>
}

export interface Capability<M extends Match> extends View<M> {
  and<W extends Match>(other: MatchSelector<W>): CapabilityGroup<[M, W]>
}

export interface CapabilityGroup<M extends Match[]> extends View<Amplify<M>> {
  and<W extends Match>(other: MatchSelector<W>): CapabilityGroup<[...M, W]>
}

export type Derive<M extends Match, W extends Match> = W extends Match<
  infer T,
  infer N
>
  ? MatchSelector<Match<T, N | M>>
  : never

export interface Amplify<Members extends Match[]>
  extends Match<InferValue<Members>, Amplify<InferMatch<Members>>> {}

export type InferMembers<Selectors extends unknown[]> = Selectors extends [
  MatchSelector<infer Match>,
  ...infer Rest
]
  ? [Match, ...InferMembers<Rest>]
  : Selectors extends []
  ? []
  : never

export type InferValue<Members extends unknown[]> = Members extends []
  ? []
  : Members extends [Match<infer T>, ...infer Rest]
  ? [T, ...InferValue<Rest>]
  : never

export type InferMatch<Members extends unknown[]> = Members extends []
  ? []
  : Members extends [Match<unknown, infer M>, ...infer Rest]
  ? [M, ...InferMatch<Rest>]
  : never

export interface ParsedCapability<
  Can extends API.Ability = API.Ability,
  C extends Caveats = Caveats
> {
  can: Can
  with: URL
  caveats: InferCaveats<C>
}

export type InferCaveats<C> = {
  [Key in keyof C]: C[Key] extends Parser<unknown, infer T, Failure> ? T : never
}

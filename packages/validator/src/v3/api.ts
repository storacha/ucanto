export * from "../api.js"
import * as API from "../api.js"

export type { Capability, Ability, Resource } from "../api.js"

export interface Checker<T, M extends Match<any, any>> {
  check: Check<T, M>
}

export interface Match<T = unknown, M extends Match = Match<unknown, any>> {
  value: T
  select(capabilites: API.Capability[]): M[]
}

export interface DirectMatch<T> extends Match<T, DirectMatch<T>> {}

export interface Parse<T> {
  (capability: API.Capability): API.Result<T, API.InvalidCapability>
}

export interface Check<T, M extends Match<{ can: API.Ability }, any>> {
  (claim: T, provided: M["value"]): boolean
}

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
export interface CapabilityDescriptor<
  Can extends API.Ability = API.Ability,
  C extends Caveats = Caveats
> {
  can: Can
  with: Parser<string, URL, Failure>
  caveats?: C

  check: Check<CapabilityView<Can, C>, DirectMatch<CapabilityView<Can, C>>>
}

export interface Descriptor<T extends CapabilityView, M extends Match> {
  can: T["can"]
  with: Parser<string, T["with"], Failure>
  caveats?: InferCaveatsDescriptor<T>
  derives: (claim: T, capability: M["value"]) => boolean
}

export interface CapabilityConfig<
  Ability extends API.Ability,
  Constraints extends Caveats,
  M extends Match
> extends Descriptor<CapabilityView<Ability, Constraints>, M> {}

export type InferCaveatsDescriptor<T extends CapabilityView> = {
  [Key in keyof T["caveats"]]: T["caveats"][Key] extends infer U
    ? Parser<unknown, T["caveats"][Key], Failure>
    : never
}

export interface Selector<M extends Match> {
  match(capability: API.Capability): M | null
  select(capabilites: API.Capability[]): M[]
  or<W extends Match>(other: Selector<W>): Selector<M | W>
  derive<T>(options: DeriveSelector<M, T>): Selector<DerivedMatch<T, M>>
}

export interface DerivedMatch<T, M extends Match>
  extends Match<T, M | DerivedMatch<T, M>> {}

export interface DeriveSelector<M extends Match, T> {
  to: Selector<DirectMatch<T>>
  derives: (self: T, from: M["value"]) => boolean
}

export interface Derives<T, U> {
  (self: T, from: U): boolean
}

export interface UnitSelector<M extends Match> extends Selector<M> {
  and<W extends Match>(other: Selector<W>): Selector<Amplify<[M, W]>>
}

export interface GroupSelector<M extends Match[]> extends Selector<Amplify<M>> {
  and<W extends Match>(other: Selector<W>): GroupSelector<[...M, W]>
}

export type Derive<M extends Match, W extends Match> = W extends Match<
  infer T,
  infer N
>
  ? Selector<Match<T, N | M>>
  : never

export interface Amplify<Members extends Match[]>
  extends Match<InferValue<Members>, Amplify<InferMatch<Members>>> {}

export type InferMembers<Selectors extends unknown[]> = Selectors extends [
  Selector<infer Match>,
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

export interface CapabilityView<
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

export interface DeriveOptions<
  Can extends API.Ability,
  C extends Caveats,
  M extends Match<{ can: API.Ability }, any>
> {
  can: Can
  with: Parser<string, URL, Failure>
  caveats?: C

  check: Check<CapabilityView<Can, C>, M>
}

export interface Select<M extends Match> {
  match(capability: API.Capability): null | M
}

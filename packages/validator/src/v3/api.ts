export * from "../api.js"
import * as API from "../api.js"

export type { Capability, Ability, Resource } from "../api.js"

export type Group<K extends string = string, M extends Matcher = Matcher> = {
  [Key in K]: M
}

export type InferSubGroup<Members extends Group> = {
  [Key in keyof Members]: Members[Key] extends Matcher<Match<infer _, infer M>>
    ? Matcher<M>
    : never
}

export interface Matcher<M extends Match = Match> {
  match(capabilites: API.Capability[]): M[]

  derive<E extends { can: API.Ability }>(
    descriptor: DeriveDescriptor<E, M>
  ): Matcher<Match<E, M>>

  or<W extends Match<{ can: API.Ability }, any>>(
    other: Matcher<W>
  ): Matcher<M | W>
}

export interface Checker<T, M extends Match<any, any>> {
  check: Check<T, M>
}

export type InferGroupValue<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<Match<infer T, any>> ? T : never
} & { can: API.Ability }

export type InferSubGroupValue<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<Match<infer _, Match<infer U, any>>>
    ? U
    : never
}

export type InferGroupMatch<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<infer M> ? M : never
}

export type InferSubGroupMatch<Members extends Group> = {
  [K in keyof Members]: Members[K] extends Matcher<Match<infer _, infer Match>>
    ? Match
    : never
}

export interface Match<T = unknown, M extends Match = Match<unknown, any>> {
  value: T
  select(capabilites: API.Capability[]): M[]
}

export interface DirectMatch<T> extends Match<T, DirectMatch<T>> {}

export interface GroupMatch<Members extends Group>
  extends Match<InferGroupValue<Members>, GroupMatch<InferSubGroup<Members>>> {}

export interface Parse<T> {
  (capability: API.Capability): API.Result<T, API.InvalidCapability>
}

export interface Check<T, M extends Match<{ can: API.Ability }, any>> {
  (claim: T, provided: M["value"]): boolean
}

export interface andDescriptor<T, M extends Match<{ can: API.Ability }, any>> {
  parse: Parse<T>
  check: Check<T, M>
}

export interface IndirectMatcherDescriptor<T, M extends Match<any, any>> {
  parse: Parse<T>
  check: Check<T, M>
  delegates: Matcher<M>
}

export interface DirectMatcherDescriptor<T extends { can: API.Ability }> {
  parse: Parse<T>
  check: Check<T, DirectMatch<T>>
  delegates?: undefined
}

export interface MatcherFactory {
  <T extends { can: API.Ability }, M extends Match>(
    descriptor: IndirectMatcherDescriptor<T, M>
  ): Matcher<Match<T, M>>
  <T extends { can: API.Ability }>(
    descriptor: DirectMatcherDescriptor<T>
  ): Matcher<Match<T, DirectMatch<T>>>
}

export declare var matcher: MatcherFactory

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

export type InferTuple<Selectors extends unknown[]> = Selectors extends []
  ? []
  : Selectors extends [Selector<Match<infer T>>, ...infer Rest]
  ? [T, ...InferMembers<Rest>]
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

export interface CapabilitySelector<
  T extends CapabilityView,
  M extends Match = DirectMatch<T>
> {
  derives: (claim: T, capability: T) => boolean
  match(capability: API.Capability): Match<T, M> | null
  select(capabilities: API.Capability[]): Match<T, M>[]
  or<U extends CapabilityView, W extends Match>(
    other: CapabilitySelector<U>
  ): CapabilitySelector<T, M> | CapabilitySelector<U, W>

  and<U extends CapabilityView, W extends Match>(
    other: CapabilitySelector<U, W>
  ): AmplificationSelector<[T, U], [M, W]>

  derive<U extends CapabilityView, W extends Match>(options: {
    as: CapabilitySelector<U, W>
    derives: (claimed: U, provided: T) => boolean
  }): CapabilitySelector<U, W | Match<T, M>>
}

export interface AmplificationMatch<M extends Match[]>
  extends Match<
    InferAmplificationValue<M>,
    AmplificationMatch<InferAmplificationMatch<M>>
  > {}

export interface AmplificationSelector<
  T extends CapabilityView[],
  M extends Match[]
> {
  derives: (claim: T, capability: T) => boolean
  match(capability: API.Capability): Match<T, AmplificationMatch<M>> | null
  select(capabilities: API.Capability[]): Match<T, AmplificationMatch<M>>[]
  or<U extends CapabilityView, W extends Match>(
    other: CapabilitySelector<U>
  ): AmplificationSelector<T, M> | CapabilitySelector<U, W>

  and<U extends CapabilityView, W extends Match>(
    other: CapabilitySelector<U, W>
  ): AmplificationSelector<[...T, U], [...M, W]>

  derive<U extends CapabilityView, W extends Match>(options: {
    as: CapabilitySelector<U, W>
    derives: (claim: U, provided: T) => boolean
  }): CapabilitySelector<U, W | Match<T, AmplificationMatch<M>>>
  join<U extends CapabilityView>(
    into: (...values: T) => U
  ): CapabilitySelector<U, AmplificationMatch<M>>
}

export interface CapabilityView<
  Can extends API.Ability = API.Ability,
  C extends Caveats = Caveats
> {
  can: Can
  with: URL
  caveats: InferCaveats<C>
}

export interface CapabilityMatcher<
  A extends API.Ability = API.Ability,
  C extends Caveats = Caveats,
  M extends Match = BaseCapabilityMatch<A, C>
> extends Matcher<CapabilityMatch<A, C, M>> {
  and<B extends API.Ability = API.Ability, D extends Caveats = Caveats>(
    option: DeriveOptions<B, D, CapabilityMatch<A, C>>
  ): Matcher<CapabilityMatch<B, D, CapabilityMatch<A, C>>>

  amplify<O extends Match>(
    other: Matcher<O>
  ): AmilficationMatcher<[CapabilityMatch<A, C, M>, O]>
}

export interface AmilficationMatcher<M extends Match[]>
  extends Matcher<MatchAmilfication<M>> {
  amplify<O extends Match>(other: Matcher<O>): AmilficationMatcher<[...M, O]>
  use(): InferAmplification<M>
  join<A extends API.Ability, C extends Caveats>(
    into: (...values: InferAmplification<M>) => CapabilityView<A, C>[]
  ): CapabilityMatcher<A, C, MatchAmilfication<M>>
}

export interface MatchAmilfication<M extends Match[]>
  extends Match<
    InferAmplification<M>,
    MatchAmilfication<InferAmplificationMatch<M>>
  > {}

export type InferAmplification<M extends unknown[]> = M extends []
  ? []
  : M extends [Match<infer T>, ...infer Rest]
  ? [T, ...InferAmplification<Rest>]
  : M

export type InferAmplificationMatch<Matches extends Match[]> =
  Matches extends []
    ? []
    : Matches extends [Match<unknown, infer M>, ...infer Rest]
    ? [M, ...InferAmplificationMatch<Rest & Match[]>]
    : never

export type InferAmplificationValue<Matches extends Match[]> =
  Matches extends []
    ? []
    : Matches extends [Match<infer T, Match>, ...infer Rest]
    ? [T, ...InferAmplificationMatch<Rest & Match[]>]
    : never

export type InferAmplificationInput<I extends unknown[]> = I extends []
  ? []
  : I extends [Matcher<infer M>, ...infer Rest]
  ? [M, ...InferAmplificationInput<Rest>]
  : never

export interface CapabilityMatch<
  A extends API.Ability = API.Ability,
  C extends Caveats = Caveats,
  M extends Match = Match
> extends Match<CapabilityView<A, C>, M> {}

export interface BaseCapabilityMatch<
  A extends API.Ability = API.Ability,
  C extends Caveats = Caveats
> extends CapabilityMatch<A, C, BaseCapabilityMatch<A, C>> {}
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

export interface AmilficationDescriptor<
  Can extends API.Ability,
  C extends Matcher[],
  T extends CapabilityView<Can>
> {
  can: Can
  of: C
  join: (...values: InferAmplificationValues<C>) => T | null | undefined
}

type InferAmplificationValues<C extends Matcher[]> = C extends []
  ? []
  : C extends [Matcher<Match<infer T>>, ...infer Rest]
  ? [T, ...InferAmplificationValues<Rest & Matcher[]>]
  : never

export interface Selection<T, M extends Match> extends Select<M> {
  derives(value: T, from: M["value"]): boolean
}

export interface Select<M extends Match> {
  match(capability: API.Capability): null | M
}

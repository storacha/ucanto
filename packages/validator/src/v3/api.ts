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
  [K in keyof D]: D[K] extends Matcher<infer Match> ? Match : never
}

export type InferSubGroupMatch<Members extends Group> = {
  [K in keyof Members]: Members[K] extends Matcher<Match<infer _, infer Match>>
    ? Match
    : never
}

export interface Match<
  T extends { can: API.Ability } = { can: API.Ability },
  M extends Match = Match<{ can: API.Ability }, any>
> {
  value: T
  match(capabilites: API.Capability[]): M[]
}

export interface DirectMatch<T extends { can: API.Ability }>
  extends Match<T, DirectMatch<T>> {}

export interface GroupMatch<Members extends Group>
  extends Match<InferGroupValue<Members>, GroupMatch<InferSubGroup<Members>>> {}

export interface Parse<T> {
  (capability: API.Capability): API.Result<T, API.InvalidCapability>
}

export interface Check<T, M extends Match<{ can: API.Ability }, any>> {
  (claim: T, provided: M["value"]): boolean
}

export interface DeriveDescriptor<
  T,
  M extends Match<{ can: API.Ability }, any>
> {
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

export interface CapabilityView<
  Can extends API.Ability = API.Ability,
  C extends Caveats = Caveats
> {
  can: Can
  with: URL
  caveats: InferCaveats<C>
}

export interface CapabilityMatcher<
  Can extends API.Ability = API.Ability,
  C extends Caveats = Caveats
> extends Matcher<DirectMatch<CapabilityView<Can, C>>> {}

export type InferCaveats<C> = {
  [Key in keyof C]: C[Key] extends Parser<unknown, infer T, Failure> ? T : never
}

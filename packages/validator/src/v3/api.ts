export * from "../api.js"
import * as API from "../api.js"

export type { Capability } from "../api.js"
export type Group<K extends string = string, M extends Matcher = Matcher> = {
  [Key in K]: M
}

export type InferSubGroup<Members extends Group> = {
  [Key in keyof Members]: Members[Key] extends Matcher<Match<unknown, infer M>>
    ? Matcher<M>
    : never
}

export interface Matcher<M extends Match<unknown, any> = Match<unknown, any>> {
  match(capabilites: API.Capability[]): M[]

  derive<E>(descriptor: DeriveDescriptor<E, M["value"]>): Matcher<Match<E, M>>

  or<W extends Match<unknown, any>>(other: Matcher<W>): Matcher<M | W>
}

export interface Checker<T, U> {
  check: Check<T, U>
}

export type InferGroupValue<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<Match<infer T, any>> ? T : never
}

export type InferSubGroupValue<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<Match<unknown, Match<infer U, any>>>
    ? U
    : never
}

export type InferGroupMatch<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<infer Match> ? Match : never
}

export type InferSubGroupMatch<Members extends Group> = {
  [K in keyof Members]: Members[K] extends Matcher<Match<unknown, infer Match>>
    ? Match
    : never
}

export interface Match<T, M extends Match<unknown, any>> {
  value: T
  match(capabilites: API.Capability[]): M[]
}

export interface DirectMatch<T> extends Match<T, DirectMatch<T>> {}

export interface GroupMatch<Members extends Group>
  extends Match<InferGroupValue<Members>, GroupMatch<InferSubGroup<Members>>> {}

export interface Parse<T> {
  (capability: API.Capability): API.Result<T, API.InvalidCapability>
}

export interface Check<T, U> {
  (claim: T, provided: U): boolean
}

export interface DeriveDescriptor<T, U> {
  parse: Parse<T>
  check: Check<T, U>
}

export interface IndirectMatcherDescriptor<T, M extends Match<any, any>> {
  parse: Parse<T>
  check: Check<T, M["value"]>
  delegates: Matcher<M>
}

export interface DirectMatcherDescriptor<T> {
  parse: Parse<T>
  check: Check<T, T>
  delegates?: undefined
}

declare function group<Members extends Group>(
  members: Members
): Matcher<GroupMatch<Members>>

// declare function matcher<
//   T,
//   U = T,
//   M extends Matcher<Match<U>> = DirectMatcher<U>
// >(descriptor: MatcherDescriptor<T, U, M>): Matcher<MatchMember<T, U>>

export interface MatcherFactory {
  <T, M extends Match<unknown, any>>(
    descriptor: IndirectMatcherDescriptor<T, M>
  ): Matcher<Match<T, M>>
  <T>(descriptor: DirectMatcherDescriptor<T>): Matcher<DirectMatch<T>>
}

export declare var matcher: MatcherFactory

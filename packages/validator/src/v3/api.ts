export * from "../api.js"
import * as API from "../api.js"

export type { Capability } from "../api.js"
export type Group<K extends string = string, M extends Matcher = Matcher> = {
  [Key in K]: M
}

export interface Matcher<M extends Match = Match> {
  match(capabilites: API.Capability[]): M[]
}

export interface Checker<T, U> {
  check: Check<T, U>
}

type InferMatched<M extends Matcher> = M extends Matcher<infer T>
  ? T extends Match<infer U>
    ? U
    : never
  : never

export type InferGroupValue<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<Match<infer T>> ? T : never
}

export type InferSubGroupValue<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<Match<any, infer U>> ? U : never
}

export type InferGroupMatch<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<infer Match> ? Match : never
}

export interface DirectMatcher<T> extends Matcher<Match<T, T>> {}

export interface Match<T = unknown, U = unknown> {
  value: T
  match(capabilites: API.Capability[]): Match<U>[]
}

export interface GroupMatch<D extends Group>
  extends Match<InferGroupValue<D>, InferSubGroupValue<D>> {}

export interface Parse<T> {
  (capability: API.Capability): API.Result<T, API.InvalidCapability>
}

export interface Check<T, U> {
  (claim: T, provided: U): boolean
}

export type MatcherDescriptor<T, U> =
  | IndirectMatcherDescriptor<T, U>
  | DirectMatcherDescriptor<T>

export interface DeriveDescriptor<T, U> {
  parse: Parse<T>
  check: Check<T, U>
}

export interface IndirectMatcherDescriptor<T, U> {
  parse: Parse<T>
  check: Check<T, U>
  delegates: Matcher<Match<U>>
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
  <T, U>(descriptor: IndirectMatcherDescriptor<T, U>): Matcher<Match<T, U>>
  <T>(descriptor: DirectMatcherDescriptor<T>): Matcher<Match<T, T>>
}

export declare var matcher: MatcherFactory

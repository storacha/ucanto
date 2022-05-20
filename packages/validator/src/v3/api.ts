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

export type InferGroupMatch<D extends Group> = {
  [K in keyof D]: D[K] extends Matcher<infer M> ? M : never
}

export interface DirectMatcher<T> extends Matcher<MatchMember<T, T>> {}

export interface GroupMatcher<D extends Group> extends Matcher<GroupMatch<D>> {}

// interface Match<T = unknown, M extends Record<string, Matcher> = {}> {
//   value: T

//   next: M
// }

export interface MatchMember<T = unknown, U = unknown> {
  group: false
  value: T

  match(capabilites: API.Capability[]): Match<U>[]
}

export interface MatchGroup<T extends {} = {}, M = unknown> {
  group: true
  value: T
  matched: M

  // match(capabilites: API.Capability[]): MatchGroup<T, M>[]
}

export type Match<T = unknown> = MatchMember<T> | MatchGroup<T>

export interface GroupMatch<D extends Group>
  extends MatchGroup<InferGroupValue<D>, InferGroupMatch<D>> {}

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
): GroupMatcher<Members>

// declare function matcher<
//   T,
//   U = T,
//   M extends Matcher<Match<U>> = DirectMatcher<U>
// >(descriptor: MatcherDescriptor<T, U, M>): Matcher<MatchMember<T, U>>

export interface MatcherFactory {
  <T, U>(descriptor: IndirectMatcherDescriptor<T, U>): Matcher<
    MatchMember<T, U>
  >
  <T>(descriptor: DirectMatcherDescriptor<T>): Matcher<MatchMember<T, T>>
}

export declare var matcher: MatcherFactory

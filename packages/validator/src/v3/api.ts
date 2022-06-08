export * from "../api.js"
import * as API from "../api.js"

import type {
  Capability as SourceCapability,
  InvalidCapability,
  CanIssue,
  Tuple,
  Delegation,
} from "../api.js"
export type {
  Capability as SourceCapability,
  Ability,
  Resource,
  Problem,
  CanIssue,
} from "../api.js"

export interface Source {
  capability: API.Capability
  delegation: API.Delegation
  index: number
}

export interface Match<T = unknown, M extends Match = UnknownMatch>
  extends Selector<M> {
  source: Source[]
  value: T

  proofs: API.Delegation[]

  prune: (config: API.CanIssue) => null | Match
}

export interface MatchedCapability<T extends API.ParsedCapability> {
  capability: T
  delegation: API.Delegation
  index: number
}

export interface MatchedDerivedCapability<
  T extends API.ParsedCapability,
  M extends Matched | Match
> {
  capability: T
  delegation: API.Delegation
  index: number

  requires: M
}

export interface MatchedCapabilityGroup<
  T extends [API.ParsedCapability, ...API.ParsedCapability[]]
> {
  capabilities: T
  requires: InferRequires<T>
}

type Matched<T extends ParsedCapability = ParsedCapability> =
  | MatchedCapability<T>
  | MatchedDerivedCapability<T, Matched>

type InferRequires<T extends [unknown, ...unknown[]]> = T extends [infer U, []]
  ? [Matched<U & ParsedCapability>]
  : T extends [infer U, infer E, ...infer R]
  ? [Matched<U & ParsedCapability>, InferRequires<[E, ...R]>]
  : never

export interface UnknownMatch extends Match {}

export interface Matcher<M extends Match> {
  match(capability: Source): MatchResult<M>
}

export interface Selector<M extends Match> {
  select(sources: Source[]): Select<M>
}

export interface Select<M extends Match> {
  matches: M[]
  errors: API.DelegationError[]
  unknown: API.Capability[]
}

export interface GroupSelector<M extends Match[] = Match[]>
  extends Selector<Amplify<M>> {}

export interface MatchSelector<M extends Match>
  extends Matcher<M>,
    Selector<M> {}

export interface DirectMatch<T> extends Match<T, DirectMatch<T>> {}

export interface Parser<I, O, X extends API.Problem> {
  (input: I): API.Result<O, X>
}

export interface Caveats
  extends Record<
    string,
    Parser<
      unknown,
      string | number | object | boolean | undefined | null,
      API.Problem
    >
  > {}

export type MatchError = API.InvalidCapability | API.DelegationError

export type MatchResult<M extends Match> = API.Result<M, API.InvalidCapability>

export interface DerivedMatch<T, M extends Match>
  extends Match<T, M | DerivedMatch<T, M>> {}

export interface DeriveSelector<M extends Match, T> {
  to: MatchSelector<DirectMatch<T>>
  derives: Derives<T, M["value"]>
}

export interface Derives<T, U> {
  (self: T, from: U): API.Result<true, API.Problem>
}

export interface View<M extends Match> extends Matcher<M>, Selector<M> {
  /**
   * Defined a derived capability which can be delegated from `this` capability.
   * For example if you define `"account/validate"` capability and derive
   * `"account/register"` capability from it when validating claimed
   * `"account/register"` capability it could be proved with either
   * "account/register" delegation or "account/validate" delegation.
   *
   * ```js
   * // capability issued by account verification service on email validation
   * const verify = capability({
   *   can: "account/verify",
   *   with: URI({ protocol: "mailto:" })
   *   derives: ({ with: url }, from) =>
   *     url.href.startsWith(from.with.href) ||
   *     new Failure(`${url.href} is not contained in ${from.with.href}`)
   * })
   *
   * // derive registration capability from email verification
   * const register = validate.derive({
   *   to: capability({
   *     can: "account/register",
   *     with: URI({ protocol: "mailto:" }),
   *     derives: ({ with: url }, from) =>
   *       url.href.startsWith(from.with.href) ||
   *       new Failure(`${url.href} is not contained in ${from.with.href}`)
   *   }),
   *   derives: (registered, verified) =>
   *     registered.with.href === verified.with.href ||
   *     new Failure(`Registration email ${registered.pathname} does not match verified email ${verified.with.pathname}`)
   * })
   * ```
   */
  derive<T extends ParsedCapability>(
    options: DeriveSelector<M, T>
  ): Capability<DerivedMatch<T, M>>
}

export interface Capability<M extends Match = Match> extends View<M> {
  /**
   * Defines capability that is either `this` or the the given `other`. This
   * allows you to compose multiple capabilities into one so that you could
   * validate any of one of them without having to maintain list of supported
   * capabilities. It is especially useful when dealiving with derived
   * capability chains when you might derive capability from either one or the
   * other.
   */
  or<W extends Match>(other: MatchSelector<W>): Capability<M | W>

  /**
   * Combines this capability and the other into a capability group. This allows
   * you to define right amplifications e.g `file/read+write` could be derived
   * from `file/read` and `file/write`.
   * @example
   * ```js
   * const read = capability({
   *   can: "file/read",
   *   with: URI({ protocol: "file:" }),
   *   derives: (claimed, delegated) =>
   *   claimed.with.pathname.startsWith(delegated.with.pathname) ||
   *   new Failure(`'${claimed.with.href}' is not contained in '${delegated.with.href}'`)
   * })
   *
   * const write = capability({
   *   can: "file/write",
   *   with: URI({ protocol: "file:" }),
   *   derives: (claimed, delegated) =>
   *     claimed.with.pathname.startsWith(delegated.with.pathname) ||
   *     new Failure(`'${claimed.with.href}' is not contained in '${delegated.with.href}'`)
   * })
   *
   * const readwrite = read.and(write).derive({
   *   to: capability({
   *     can: "file/read+write",
   *     with: URI({ protocol: "file:" }),
   *     derives: (claimed, delegated) =>
   *       claimed.with.pathname.startsWith(delegated.with.pathname) ||
   *       new Failure(`'${claimed.with.href}' is not contained in '${delegated.with.href}'`)
   *     }),
   *   derives: (claimed, [read, write]) => {
   *     if (!claimed.with.pathname.startsWith(read.with.pathname)) {
   *       return new Failure(`'${claimed.with.href}' is not contained in '${read.with.href}'`)
   *     } else if (!claimed.with.pathname.startsWith(write.with.pathname)) {
   *       return new Failure(`'${claimed.with.href}' is not contained in '${write.with.href}'`)
   *     } else {
   *       return true
   *     }
   *   }
   * })
   *```
   */
  and<W extends Match>(other: MatchSelector<W>): CapabilityGroup<[M, W]>
}

export interface CapabilityGroup<M extends Match[] = Match[]>
  extends View<Amplify<M>> {
  /**
   * Creates new capability group containing capabilities from this group and
   * provedid `other` capability. This method complements `and` method on
   * `Capability` to allow chaining e.g. `read.and(write).and(modify)`.
   */
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
  C extends object = {}
> {
  can: Can
  with: API.Resource
  uri: URL
  caveats: C
}

export type InferCaveats<C> = {
  [Key in keyof C]: C[Key] extends () => infer T
    ? Exclude<T, API.Problem>
    : never
}

export type InferCaveatsDescriptor<C> = {
  [Key in keyof C]: Parser<unknown, C[Key], API.Problem>
}

export interface Descriptor<A extends API.Ability, C extends Caveats> {
  can: A
  with: Parser<API.Resource, URL, API.Problem>
  caveats?: C

  derives: Derives<
    ParsedCapability<A, InferCaveats<C>>,
    ParsedCapability<A, InferCaveats<C>>
  >
}

export interface CapabilityMatch<A extends API.Ability, C extends Caveats>
  extends DirectMatch<ParsedCapability<A, InferCaveats<C>>> {}

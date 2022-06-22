import {
  Delegation,
  Result,
  Failure,
  AuthorityParser,
  Identity,
  Resource,
  Ability,
  URI,
  Capability,
  DID,
  LinkedProof,
  Await,
  API,
} from './lib.js'

export interface Source {
  capability: Capability
  delegation: Delegation
  index: number
}

export interface Match<T = unknown, M extends Match = UnknownMatch>
  extends Selector<M> {
  source: Source[]
  value: T

  proofs: Delegation[]

  prune: (config: CanIssue) => null | Match
}

export interface UnknownMatch extends Match {}

export interface Matcher<M extends Match> {
  match(capability: Source): MatchResult<M>
}

export interface Selector<M extends Match> {
  select(sources: Source[]): Select<M>
}

export interface Select<M extends Match> {
  matches: M[]
  errors: DelegationError[]
  unknown: Capability[]
}

export interface GroupSelector<M extends Match[] = Match[]>
  extends Selector<Amplify<M>> {}

export interface MatchSelector<M extends Match>
  extends Matcher<M>,
    Selector<M> {}

export interface DirectMatch<T> extends Match<T, DirectMatch<T>> {}

export interface Decoder<
  I extends unknown,
  O extends unknown,
  X extends { error: true } = Failure
> {
  decode: (input: I) => Result<O, X>
}

export interface Caveats
  extends Record<string, Decoder<unknown, unknown, Failure>> {}

export type MatchResult<M extends Match> = Result<M, InvalidCapability>

/**
 * Error produced when parsing capabilities
 */
export type InvalidCapability = UnknownCapability | MalformedCapability

export interface DerivedMatch<T, M extends Match>
  extends Match<T, M | DerivedMatch<T, M>> {}

export interface DeriveSelector<M extends Match, T extends ParsedCapability> {
  to: TheCapabilityParser<DirectMatch<T>>
  derives: Derives<T, M['value']>
}

export interface Derives<T, U> {
  (self: T, from: U): Result<true, Failure>
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
  ): TheCapabilityParser<DerivedMatch<T, M>>
}

type InferCaveatParams<T> = {
  [K in keyof T]: T[K] extends { toJSON(): infer U } ? U : T[K]
}

export interface TheCapabilityParser<M extends Match<ParsedCapability>>
  extends CapabilityParser<M> {
  readonly can: M["value"]["can"]

  create: (
    resource: M["value"]["uri"]["href"],
    caveats: InferCaveatParams<M["value"]["caveats"]>
  ) => Capability<M["value"]["can"], M["value"]["uri"]["href"]> &
    M["value"]["caveats"]
}

export interface CapabilityParser<M extends Match = Match> extends View<M> {
  /**
   * Defines capability that is either `this` or the the given `other`. This
   * allows you to compose multiple capabilities into one so that you could
   * validate any of one of them without having to maintain list of supported
   * capabilities. It is especially useful when dealiving with derived
   * capability chains when you might derive capability from either one or the
   * other.
   */
  or<W extends Match>(other: MatchSelector<W>): CapabilityParser<M | W>

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
  and<W extends Match>(other: MatchSelector<W>): CapabilitiesParser<[M, W]>
}

export interface CapabilitiesParser<M extends Match[] = Match[]>
  extends View<Amplify<M>> {
  /**
   * Creates new capability group containing capabilities from this group and
   * provedid `other` capability. This method complements `and` method on
   * `Capability` to allow chaining e.g. `read.and(write).and(modify)`.
   */
  and<W extends Match>(other: MatchSelector<W>): CapabilitiesParser<[...M, W]>
}

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
  Can extends Ability = Ability,
  Resource extends URI = URI,
  C extends object = {}
> {
  can: Can
  with: Resource["href"]
  uri: Resource
  caveats: C
}

export type InferCaveats<C> = InferRequiredCaveats<C>

export type InferOptionalCaveats<C> = {
  [K in keyof C as C[K] extends Decoder<unknown, infer T, infer _>
    ? T extends Exclude<T, undefined>
      ? never
      : K
    : never]?: C[K] extends Decoder<unknown, infer T, infer _> ? T : never
}

export type InferRequiredCaveats<C> = {
  [K in keyof C as C[K] extends Decoder<unknown, infer T, infer _>
    ? T extends Exclude<T, undefined>
      ? K
      : never
    : never]: C[K] extends Decoder<unknown, infer T, infer _> ? T : never
}

export interface Descriptor<
  A extends Ability,
  R extends URI,
  C extends Caveats
> {
  can: A
  with: Decoder<Resource, R, Failure>
  caveats?: C

  derives: Derives<
    ParsedCapability<A, R, InferCaveats<C>>,
    ParsedCapability<A, R, InferCaveats<C>>
  >
}

export interface CapabilityMatch<
  A extends Ability,
  R extends URI,
  C extends Caveats
> extends DirectMatch<ParsedCapability<A, R, InferCaveats<C>>> {}

export interface CanIssue {
  /**
   * Informs validator whether given capability can be issued by a given
   * DID or whether it needs to be delegated to the issuer.
   */
  canIssue(capability: ParsedCapability, issuer: DID): boolean
}

export interface AuthorityOptions {
  authority: AuthorityParser
}

export interface IssuingOptions {
  /**
   * You can provide default set of capabilities per did, which is used to
   * validate whether claim is satisfied by `{ with: my:*, can: "*" }`. If
   * not provided resolves to `[]`.
   */

  my?: (issuer: DID) => Capability[]
}

export interface ProofResolver extends AuthorityOptions, IssuingOptions {
  /**
   * You can provide a proof resolver that validator will call when UCAN
   * links to external proof. If resolver is not provided validator may not
   * be able to explore correesponding path within a proof chain.
   */
  resolve?: (proof: LinkedProof) => Await<Result<Delegation, UnavailableProof>>
}

export interface ValidationOptions<C extends ParsedCapability>
  extends CanIssue,
    IssuingOptions,
    AuthorityOptions,
    ProofResolver {
  capability: CapabilityParser<Match<C, any>>
}

export interface DelegationError extends Failure {
  name: 'InvalidClaim'
  causes: (InvalidCapability | EscalatedDelegation | DelegationError)[]

  cause: InvalidCapability | EscalatedDelegation | DelegationError
}

export interface EscalatedDelegation extends Failure {
  name: 'EscalatedCapability'
  claimed: ParsedCapability
  delegated: object
  cause: Failure
}

export interface UnknownCapability extends Failure {
  name: 'UnknownCapability'
  capability: Capability
}

export interface MalformedCapability extends Failure {
  name: 'MalformedCapability'
  capability: Capability
}

export interface InvalidAudience extends Failure {
  readonly name: 'InvalidAudience'
  readonly audience: Identity
  readonly delegation: Delegation
}

export interface UnavailableProof extends Failure {
  readonly name: 'UnavailableProof'
  readonly link: LinkedProof
}

export interface Expired extends Failure {
  readonly name: 'Expired'
  readonly delegation: Delegation
  readonly expiredAt: number
}

export interface NotValidBefore extends Failure {
  readonly name: 'NotValidBefore'
  readonly delegation: Delegation
  readonly validAt: number
}

export interface InvalidSignature extends Failure {
  readonly name: 'InvalidSignature'
  readonly issuer: Identity
  readonly audience: Identity
  readonly delegation: Delegation
}

/**
 * Error produces by invalid proof
 */
export type InvalidProof =
  | Expired
  | NotValidBefore
  | InvalidSignature
  | InvalidAudience

export interface Unauthorized extends Failure {
  name: 'Unauthorized'
  cause: InvalidCapability | InvalidProof | InvalidClaim
}

export interface InvalidClaim extends Failure {
  issuer: Identity
  name: 'InvalidClaim'
  capability: ParsedCapability
  delegation: Delegation

  message: string
}

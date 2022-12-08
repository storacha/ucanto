import { Ability, Capability, DID, Link, Resource } from '@ipld/dag-ucan'
import * as UCAN from '@ipld/dag-ucan'
import {
  Delegation,
  Result,
  Failure,
  PrincipalParser,
  DIDResolver,
  Signer,
  URI,
  UCANLink,
  Await,
  IssuedInvocationView,
  UCANOptions,
  DIDKey,
  Verifier,
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

export interface Reader<
  O = unknown,
  I = unknown,
  X extends { error: true } = Failure
> {
  read: (input: I) => Result<O, X>
}

export interface Caveats {
  [key: string]: Reader<any, unknown>
}

export type MatchResult<M extends Match> = Result<M, InvalidCapability>

/**
 * Error produced when parsing capabilities
 */
export type InvalidCapability = UnknownCapability | MalformedCapability

export interface DerivedMatch<T, M extends Match>
  extends Match<T, M | DerivedMatch<T, M>> {}

export interface DeriveSelector<M extends Match, T extends ParsedCapability> {
  to: TheCapabilityParser<DirectMatch<T>>
  derives: Derives<ToDeriveClaim<T>, ToDeriveProof<M['value']>>
}

/**
 * Utility type is used to infer the type of the capability passed into
 * `derives` handler. It simply makes all `nb` fileds optional because
 * in delegation all `nb` fields could be left out implying no restrictions.
 */
export type ToDeriveClaim<T extends ParsedCapability> =
  | T
  | ParsedCapability<T['can'], T['with'], Partial<T['nb']>>

/**
 * Utility type is used to infer type of the second argument of `derives`
 * handler (in the `cap.derive({ to, derives: (claim, proof) => true })`)
 * which could be either capability or set of capabilities. It simply makes
 * all `nb` fields optional, because in delegation all `nb` fields could be
 * left out implying no restrictions.
 */
export type ToDeriveProof<T> = T extends ParsedCapability
  ? // If it a capability we just make `nb` partial
    ToDeriveClaim<T>
  : // otherwise we need to map tuple
    ToDeriveProofs<T>

/**
 * Another helper type which is equivalent of `ToDeriveClaim` except it works
 * on tuple of capabilities.
 */
type ToDeriveProofs<T> = T extends [infer U, ...infer E]
  ? [ToDeriveClaim<U & ParsedCapability>, ...ToDeriveProofs<E>]
  : T extends never[]
  ? []
  : never

export interface Derives<T extends ParsedCapability, U = T> {
  (claim: T, proof: U): Result<true, Failure>
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

export type InferCaveatParams<T> = keyof T extends never
  ? never | undefined
  : {
      [K in keyof T]: T[K] extends { toJSON(): infer U } ? U : T[K]
    }

export interface TheCapabilityParser<M extends Match<ParsedCapability>>
  extends CapabilityParser<M> {
  readonly can: M['value']['can']

  create(
    input: InferCreateOptions<M['value']['with'], M['value']['nb']>
  ): M['value']

  /**
   * Creates an invocation of this capability. Function throws exception if
   * non-optional fields are omitted.
   */

  invoke(
    options: InferInvokeOptions<M['value']['with'], M['value']['nb']>
  ): IssuedInvocationView<M['value']>

  /**
   * Creates a delegation of this capability. Please note that all the
   * `nb` fields are optional in delegation and only provided ones will
   * be validated.
   */
  delegate(
    options: InferDelegationOptions<M['value']['with'], M['value']['nb']>
  ): Promise<Delegation<[ToDeriveClaim<M['value']>]>>
}

export type InferCreateOptions<R extends Resource, C extends {} | undefined> =
  // If capability has no NB we want to prevent passing it into
  // .create funciton so we make `nb` as optional `never` type so
  // it can not be satisfied
  keyof C extends never ? { with: R; nb?: never } : { with: R; nb: C }

export type InferInvokeOptions<
  R extends Resource,
  C extends {} | undefined
> = UCANOptions & { issuer: Signer } & InferCreateOptions<R, C>

export type InferDelegationOptions<
  R extends Resource,
  C extends {} | undefined
> = UCANOptions & {
  issuer: Signer
  with: R
  nb?: Partial<InferCreateOptions<R, C>['nb']>
}

export type EmptyObject = { [key: string | number | symbol]: never }
type Optionalize<T> = InferRequried<T> & InferOptional<T>

type InferOptional<T> = {
  [K in keyof T as T[K] | undefined extends T[K] ? K : never]?: T[K]
}

type InferRequried<T> = {
  [K in keyof T as T[K] | undefined extends T[K] ? never : K]: T[K]
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

export type ParsedCapability<
  Can extends Ability = Ability,
  Resource extends URI = URI,
  C extends object = {}
> = keyof C extends never
  ? { can: Can; with: Resource; nb?: C }
  : { can: Can; with: Resource; nb: C }

export type InferCaveats<C> = Optionalize<{
  [K in keyof C]: C[K] extends Reader<infer T, unknown, infer _> ? T : never
}>

export interface Descriptor<
  A extends Ability,
  R extends URI,
  C extends Caveats
> {
  can: A
  with: Reader<R, Resource, Failure>

  nb?: C

  derives?: Derives<
    ToDeriveClaim<ParsedCapability<A, R, InferCaveats<C>>>,
    ToDeriveClaim<ParsedCapability<A, R, InferCaveats<C>>>
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

export interface PrincipalOptions {
  principal: PrincipalParser
}

export interface ProofResolver extends PrincipalOptions {
  /**
   * You can provide a proof resolver that validator will call when UCAN
   * links to external proof. If resolver is not provided validator may not
   * be able to explore corresponding path within a proof chain.
   */
  resolve?: (proof: Link) => Await<Result<Delegation, UnavailableProof>>
}

export interface Docs {
  [key: DID]: { key: DIDKey }
}

export interface Validator {
  authority: Verifier
}

export interface ValidationOptions<
  C extends ParsedCapability = ParsedCapability
> extends Partial<CanIssue>,
    Validator,
    PrincipalOptions,
    ProofResolver,
    DIDResolver {
  capability: CapabilityParser<Match<C, any>>
}

export interface ClaimOptions
  extends Partial<CanIssue>,
    Validator,
    PrincipalOptions,
    ProofResolver,
    DIDResolver {}

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
  readonly audience: UCAN.Principal
  readonly delegation: Delegation
}

export interface UnavailableProof extends Failure {
  readonly name: 'UnavailableProof'
  readonly link: UCANLink
}

export interface DIDResolutionError extends Failure {
  readonly name: 'DIDResolutionError'
  readonly did: UCAN.DID
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
  readonly issuer: UCAN.Principal
  readonly audience: UCAN.Principal
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
  | DIDResolutionError
  | UnavailableProof

export interface Unauthorized extends Failure {
  name: 'Unauthorized'
  cause: InvalidCapability | InvalidProof | InvalidClaim | UnfoundedClaim
}

export interface InvalidClaim extends Failure {
  issuer: UCAN.Principal
  name: 'InvalidClaim'
  delegation: Delegation

  message: string
}

export interface UnfoundedClaim extends Failure {
  name: 'UnfoundedClaim'
}

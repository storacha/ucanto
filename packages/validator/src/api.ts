import * as UCAN from "@ipld/dag-ucan"
import type { Capability } from "@ipld/dag-ucan"
import type {
  InvocationView,
  Delegation,
  Identity,
  Authority,
} from "@ucanto/interface"

export type { Capability }
export * from "@ucanto/interface"

/**
 * Error produced when accessing a capability
 */
export type DenyAccess<C> = InvalidProof | InvalidCapability | InvalidClaim<C>

/**
 * Error produces by invalid proof
 */
export type InvalidProof = Expired | NotValidBefore | InvalidSignature

/**
 * Error produced when parsing capabilities
 */
export type InvalidCapability = UnknownCapability | MalformedCapability

export type ProofError<C> =
  | UnavailableProof
  | InvalidProof
  | InvalidAudience
  | InvalidClaim<C>
  | EscalatedClaim<C>
  | InvalidEvidence<C>

export interface InvalidAudience extends Error {
  readonly error: this
  readonly name: "InvalidAudience"
  readonly audience: Identity
  readonly delegation: Delegation
}

export interface Expired extends Error {
  readonly name: "Expired"
  readonly error: this
  readonly delegation: Delegation
  readonly expiredAt: number
}

export interface NotValidBefore extends Error {
  readonly name: "NotValidBefore"
  readonly delegation: Delegation
  readonly validAt: number

  readonly error: this
}

export interface Claim<C> {
  capability: C
  issuer: Authority
}

/**
 * Function checks if the claimed capability is met by given set of capaibilites. Note that function takes capability
 * views as opposed to raw capaibilites (This implies that raw JSON capabilites were succesfully parsed into known
 * capability with specific semantics).
 *
 * Function returns either succesfull sets of proofs that support claimed capability or a set of escalation errors.
 * If claimed capability is unfunded, meaning give capabilities are not comparable result is still an error of empty
 * escalation set (Maybe we should consider union with 3 variants instead to make this more explicit)
 *
 * Please note that it is possible that claim may be met by some capaibilites while at the same time it may
 * escalate constraint of others. In this case function still returns succesfull set of proofs discarding
 * violations (maybe it should not ?).
 *
 * Note: succesfull result provides iterator of proofs. That allows constraint solver to be lazy as in
 * return succesfully as soon as first proof is found and defer finding other proofs until constraint
 * solver deciedes to explore other paths.
 */
export declare function claim<C extends CapabilityView>(
  capability: C,
  given: C[]
): Result<IterableIterator<Evidence<C>>, EscalatedClaim<C>>

/**
 * Represents succesfully parsed capability. Idea is that user could provide capability parser that UCAN
 * library will use to filter out capaibilites that can be compared from the ones it is unable to
 * recognize.
 */
export interface CapabilityView<C extends UCAN.Capability = UCAN.Capability> {
  capability: C
}

export interface UCANView<C extends CapabilityView> {
  ucan: UCAN.View
  capabilityParser: CapabilityParser<C>
  capabilities: C[]

  // capabilities that parser was unable to parse
  unkownCapabilities: IterableIterator<UCAN.Capability>
}

export interface CapabilityParser<C extends {}> {
  /**
   * Returns either succesfully parsed capability or null for unknown capability
   */
  (capability: UCAN.Capability): Result<C, InvalidCapability>
}

/**
 * Proof of a claimed capability, contains claimed capability (view) and subset of available
 * capaibilites that satisfy it.
 */
export interface Evidence<C> {
  claimed: C
  capabilities: C[]
}

export interface EscalatedClaim<C> extends Error {
  name: "EscalatedClaim"
  error: this
  esclacations: EscalationError<C>[]
}

/**
 * Represents capability escalation and contains non empty set of
 * contstraint violations.
 */

export interface EscalationError<C> extends Error {
  readonly name: "EscalationError"
  readonly error: this

  /**
   * claimed capability
   */
  readonly claimed: C

  /**
   * escalated capability
   */
  readonly escalated: C

  /**
   * non empty set of constraint violations
   */
  readonly violations: ConstraintViolationError<C>[]
}

/**
 * Represents specific constraint violation by the claimed capability.
 */
export interface ConstraintViolationError<C> extends Error {
  readonly error: this
  readonly name: "ConstraintViolationError"
  /**
   * Constraint that was violated.
   */
  readonly claimed: Constraint<C>
  /**
   * Claim that exceeds imposed constraint.
   */
  readonly violated: Constraint<C>
}

/**
 * Represents violated constraint in the claim. Carrynig information about
 * which specific constraint.
 */
export interface Constraint<C> {
  readonly capability: C
  readonly name: string
  readonly value: unknown
}

export interface InvalidClaim<C> extends Error {
  readonly name: "InvalidClaim"
  readonly error: this
  readonly capability: C
  readonly delegation: Delegation

  readonly proofs: ProofError<C>[]
}

export interface InvalidEvidence<C> extends Error {
  readonly name: "InvalidEvidence"
  readonly error: this
  readonly evidence: Evidence<C>
  readonly delegation: Delegation

  readonly proofs: InvalidClaim<C>[]
}

export type ClaimErrorReason<C> =
  | UnfoundedClaim<C>
  | ExpriedClaim
  | InactiveClaim
  | InvalidSignature
  | ViolatingClaim<C>
  | InvalidClaim<C>
  | UnavailableProof
  | WrongAudience

export interface ExpriedClaim {
  readonly name: "ExpriedClaim"
  readonly issuer: Identity
  readonly audience: Identity

  readonly expiredAt: Time
}

export interface InactiveClaim {
  readonly name: "InactiveClaim"
  readonly issuer: Identity
  readonly audience: Identity

  readonly activeAt: Time
}

export interface UnfoundedClaim<C> {
  readonly name: "UnfoundedClaim"
  readonly capability: C
  readonly delegation: Delegation
}

export interface ViolatingClaim<C> extends Error {
  readonly error: this
  readonly name: "ViolatingClaim"
  readonly claim: C
  readonly escalates: EscalationError<C>[]
}

export interface InvalidSignature extends Error {
  readonly error: this
  readonly name: "InvalidSignature"
  readonly issuer: Identity
  readonly audience: Identity
  readonly delegation: Delegation
}

export interface UnavailableProof extends Error {
  readonly name: "UnavailableProof"
  readonly link: UCAN.Proof

  readonly error: this
}

export interface WrongAudience extends Error {
  readonly error: this
  readonly name: "WrongAudience"
  readonly issuer: Identity
  readonly audience: Identity
}

export interface Access<C> {
  capability: C
  proof: Authorization<C>
}

export interface Authorization<C> {
  issuer: Identity
  audience: Identity
  capabilities: C[]

  proofs: Authorization<C>[]
}

export interface UnknownCapability extends Error {
  error: this
  capability: UCAN.Capability
}

export interface MalformedCapability extends Error {
  error: this
  capability: UCAN.Capability
}

export type Time = number

export interface ValidationOptions<C extends object> {
  /**
   * Informs validator whether given capability can be issued by a given
   * DID or whether it needs to be delegated to the issuer.
   */
  canIssue: (capability: C, issuer: UCAN.DID) => boolean

  /**
   * You can provide default set of capabilities per did, which is used to
   * validate whether claim is satisfied by `{ with: my:*, can: "*" }`. If
   * not provided resolves to `[]`.
   */

  my?: (issuer: UCAN.DID) => UCAN.Capability[]

  /**
   * You can provide a proof resolver that validator will call when UCAN
   * links to external proof. If resolver is not provided validator may not
   * be able to explore correesponding path within a proof chain.
   */
  resolve?: (
    proof: UCAN.Proof
  ) => UCAN.Await<Result<Delegation, UnavailableProof>>

  /**
   * Capability parser that is used to parse generic capabilities into specific
   * ones that checker can be run against.
   */
  parse: CapabilityParser<C>

  /**
   * Function which checks whether claimed capabily is met by provided
   * capability set. Should eithter return iterable evidence paths that
   * could be explored by a validator or a ClaimError.
   */
  check: (
    claim: C,
    capabilities: C[]
  ) => Result<IterableIterator<Evidence<C>>, EscalatedClaim<C>>
}

export interface Validate {
  <C extends object>(
    invocation: InvocationView<Capability>,
    options: ValidationOptions<C>
  ): UCAN.Await<Result<Access<C>, InvalidClaim<C> | EscalatedClaim<C>>>
}

interface Matcher {
  match<T, U>(capability: Capability): CapabilityHandler<T, U>
}
interface CapabilityHandler<T, U> {
  /**
   * @param {API.Capability} capability
   */
  match(capability: Capability): Result<T, InvalidCapability>
  parse(capability: Capability): Result<U, InvalidCapability>
  check(claim: T, capabilities: U[]): Result<U[][], CheckError<T, U>>
}

export interface CheckError<T, U> extends Error {
  error: this
  claim: T
  errors: { capabilites: U[]; violations: ViolatingClaim<U>[] }[]
}

export type Result<
  T extends NonNullable<unknown>,
  X extends { error: Error }
> = (T & { error?: undefined }) | X

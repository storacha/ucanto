import * as UCAN from "@ipld/dag-ucan"
import type { Ability, Capability, Resource } from "@ipld/dag-ucan"
import type {
  Invocation,
  Delegation,
  Identity,
  Authority,
  Result,
  AuthorityParser,
} from "@ucanto/interface"

import type {
  Matcher,
  Match,
  Selector,
  Source,
  MatchError,
  ParsedCapability,
  Capability as CapabilityParser,
} from "./capability/api.js"

export type {
  Capability,
  Ability,
  Source,
  Resource,
  Matcher,
  Match,
  Selector,
  ParsedCapability,
}
export * from "@ucanto/interface"

/**
 * Error produced when accessing a capability
 */
export type DenyAccess<C> = InvalidProof | InvalidCapability | DelegationError

/**
 * Error produces by invalid proof
 */
export type InvalidProof =
  | Expired
  | NotValidBefore
  | InvalidSignature
  | InvalidAudience

/**
 * Error produced when parsing capabilities
 */
export type InvalidCapability = UnknownCapability | MalformedCapability

export type ProofError<C> =
  | UnavailableProof
  | InvalidProof
  | InvalidClaim<C>
  | EscalatedClaim<C>
  | InvalidEvidence<C>

export interface InvalidAudience extends Problem {
  readonly name: "InvalidAudience"
  readonly audience: Identity
  readonly delegation: Delegation
}

export interface Expired extends Problem {
  readonly name: "Expired"
  readonly delegation: Delegation
  readonly expiredAt: number
}

export interface NotValidBefore extends Problem {
  readonly name: "NotValidBefore"
  readonly delegation: Delegation
  readonly validAt: number
}

// export interface Claim<C> {
//   capability: C
//   issuer: Authority
// }

/**
 * Function checks if the claimed capability is met by given set of capaibilites. Note that function takes capability
 * views as opposed to raw capaibilites (This implies that raw JSON capabilities were succesfully parsed into known
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

/**
 * Proof of a claimed capability, contains claimed capability (view) and subset of available
 * capaibilites that satisfy it.
 */
export interface Evidence<C> {
  claimed: C
  capabilities: C[]
}

export interface Problem extends Error {
  error: true
}

export interface DelegationError extends Problem {
  name: "InvalidClaim"
  causes: (InvalidCapability | EscalatedDelegation | DelegationError)[]

  cause: InvalidCapability | EscalatedDelegation | DelegationError
}

export interface EscalatedDelegation extends Problem {
  name: "EscalatedCapability"
  claimed: import("./capability/api").ParsedCapability
  delegated: object
  cause: Problem
}

export interface InvalidDelegation extends Problem {
  name: "InvalidDelegation"
  claimed: import("./capability/api").Match
  delegated: object
  cause: MalformedCapability | InvalidDelegation | EscalatedDelegation
}

export interface EscalatedCapability extends Problem {
  name: "EscalatedCapability"
  capability: Capability
  cause: Problem
}
export interface EscalatedClaim<C> extends Error {
  name: "EscalatedClaim"
  error: true
  esclacations: EscalationError<C>[]
}

/**
 * Represents capability escalation and contains non empty set of
 * contstraint violations.
 */

export interface EscalationError<C> extends Problem {
  readonly name: "EscalationError"

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
export interface ConstraintViolationError<C> extends Problem {
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

export interface InvalidClaim<C> extends Problem {
  readonly name: "InvalidClaim"
  readonly capability: C
  readonly delegation: Delegation

  readonly errors: DelegationError[]
  readonly unknown: Capability[]
}

export interface InvalidEvidence<C> extends Error {
  readonly name: "InvalidEvidence"
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

export interface ViolatingClaim<C> extends Problem {
  readonly name: "ViolatingClaim"
  readonly claim: C
  readonly escalates: EscalationError<C>[]
}

export interface InvalidSignature extends Problem {
  readonly name: "InvalidSignature"
  readonly issuer: Identity
  readonly audience: Identity
  readonly delegation: Delegation
}

export interface UnavailableProof extends Problem {
  readonly name: "UnavailableProof"
  readonly link: UCAN.Proof
}

export interface WrongAudience extends Problem {
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

export interface Auth<C extends ParsedCapability> {
  match: Match<C>
  proof: Auth<C> | null
}

export interface UnknownCapability extends Problem {
  name: "UnknownCapability"
  capability: UCAN.Capability
}

export interface MalformedCapability extends Problem {
  name: "MalformedCapability"
  capability: UCAN.Capability
}

export type Time = number

export interface CanIssue {
  /**
   * Informs validator whether given capability can be issued by a given
   * DID or whether it needs to be delegated to the issuer.
   */
  canIssue(capability: ParsedCapability, issuer: UCAN.DID): boolean
}

export interface ValidationOptions<
  C extends ParsedCapability = ParsedCapability
> extends CanIssue {
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

  authority: AuthorityParser
  capability: CapabilityParser<Match<C>>
}

export interface Validate {
  <C extends ParsedCapability>(
    invocation: Invocation<Capability>,
    options: ValidationOptions<C>
  ): UCAN.Await<Result<Access<C>, InvalidClaim<C> | EscalatedClaim<C>>>
}

export interface CheckError<T, U> extends Problem {
  claim: T
  errors: { capabilities: U[]; violations: ViolatingClaim<U>[] }[]
}

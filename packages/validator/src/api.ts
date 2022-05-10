import * as UCAN from "@ipld/dag-ucan"
import type {
  Result,
  InvocationView,
  Delegation,
  Identity,
} from "@ucanto/interface"

export type { Result }
export * from "@ucanto/interface"

export interface Capability extends UCAN.Capability, Record<string, unknown> {}

/**
 * Function attempt to access capability from given UCAN view (which in nutshell is UCAN with attached capability parser
 * so it can map known capabilites to richer views and surface unknown capabilities). It returns is either successful result
 * with capability view and authorization proof chain or an error describing reason why requested capability is invaid.
 *
 * Access internally utilized `claim` function and walks up the proof chain until it is able to proove that claim is unfounded.
 */

export declare function access<C extends CapabilityView>(
  capability: UCAN.Capability,
  ucan: UCANView<C>
): Result<Access<C>, InvalidClaim<C>>

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
): Result<IterableIterator<Evidence<C>>, ClaimError<C>>

/**
 * Represents succesfully parsed capability. Idea is that user could provide capability parser that UCAN
 * library will use to filter out capaibilites that can be compared from the ones it is unable to
 * recognize.
 */
export interface CapabilityView<C extends UCAN.Capability = UCAN.Capability> {
  ok: true
  capability: C
}

export interface UCANView<C extends CapabilityView> {
  ucan: UCAN.View
  capabilityParser: CapabilityParser<C>
  capabilities: C[]

  // capabilities that parser was unable to parse
  unkownCapabilities: IterableIterator<UCAN.Capability>
}

export interface CapabilityParser<C extends CapabilityView> {
  /**
   * Returns either succesfully parsed capability or null for unknown capability
   */
  parse(capability: UCAN.Capability): C | null | undefined
}

/**
 * Proof of a claimed capability, contains claimed capability (view) and subset of available
 * capaibilites that satisfy it.
 */
export interface Evidence<C> {
  claimed: C
  capabilities: C[]
}

export interface ClaimError<C> extends Error {
  name: "ClaimError"
  esclacations: EscalationError<C>[]
}

/**
 * Represents capability escalation and contains non empty set of
 * contstraint violations.
 */

export interface EscalationError<C> extends Error {
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
  readonly violations: IterableIterator<ConstraintViolationError<C>>
}

/**
 * Represents specific constraint violation by the claimed capability.
 */
export interface ConstraintViolationError<C> {
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
  readonly claim: C
  readonly issuer: Identity
  readonly audience: Identity

  readonly reason: ClaimErrorReason<C>
}

export interface UnsupportedClaim extends Error {
  readonly name: "UnsupportedClaim"
  readonly capability: UCAN.Capability
  readonly issuer: Identity
}

export type ClaimErrorReason<C> =
  | UnfundedClaim<C>
  | ExpriedClaim
  | InactiveClaim
  | InvalidSignature
  | ViolatingClaim<C>
  | InvalidClaim<C>
  | ProofNotFound
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

export interface UnfundedClaim<C> {
  readonly name: "UnfundedClaim"
  readonly claim: C

  readonly issuer: Identity
  readonly audience: Identity
}

export interface ViolatingClaim<C> {
  readonly name: "ViolatingClaim"
  readonly issuer: Identity
  readonly audience: Identity

  readonly claim: C
  readonly escalates: EscalationError<C>[]
}

export interface InvalidSignature {
  readonly name: "InvalidSignature"
  readonly issuer: Identity
  readonly audience: Identity
  readonly delegation: UCAN.View
}

export interface ProofNotFound extends Error {
  readonly name: "ProofNotFound"
  readonly link: UCAN.Proof
}

export interface WrongAudience extends Error {
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

export interface UnknownCapability {
  ok: false
  capability: UCAN.Capability
}

export type Time = number

export interface ValidationOptions<C> {
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
  resolve?: (proof: UCAN.Proof) => UCAN.Await<Result<Delegation, ProofNotFound>>

  /**
   * Capability parser that is used to parse generic capabilities into specific
   * ones that checker can be run against.
   */
  parse: (capability: UCAN.Capability) => Result<C>

  /**
   * Function which checks whether claimed capabily is met by provided
   * capability set. Should eithter return iterable evidence paths that
   * could be explored by a validator or a ClaimError.
   */
  check: (
    claim: C,
    capabilities: C[]
  ) => Result<IterableIterator<Evidence<C>>, ClaimError<C>>
}

export interface Validate {
  <C>(
    invocation: InvocationView<Capability>,
    options: ValidationOptions<C>
  ): UCAN.Await<Result<Access<C>, InvalidClaim<C> | UnsupportedClaim>>
}

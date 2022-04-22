import * as UCAN from "@ipld/dag-ucan"
import type { Result } from "../api.js"

export type { Result }
export * from "@ipld/dag-ucan"

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
  capability: C
}

/**
 * Proof of a claimed capability, contains claimed capability (view) and subset of available
 * capaibilites that satisfy it.
 */
interface Evidence<C> {
  claimed: C
  capaibilites: C[]
}

export interface ClaimError<C> extends Error {
  esclacations: EscalationError<C>[]
}

/**
 * Represents capability escalation and contains non empty set of
 * contstraint violations.
 */

export interface EscalationError<C> extends RangeError {
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
export interface ConstraintViolationError<C> extends RangeError {
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

export interface InvalidClaim<C extends CapabilityView = CapabilityView>
  extends Error {
  readonly name: "InvalidClaim"
  readonly claim: C
  readonly by: UCAN.DID
  // I know to is broken english but "from" is too ambigius as it can be "claim from gozala" or  "gozala claimed car from robox"
  readonly to: UCAN.DID

  reason:
    | UnfundedClaim<C>
    | ExpriedClaim<C>
    | InactiveClaim<C>
    | ViolatingClaim<C>
    | InvalidClaim<C>
}

interface ExpriedClaim<C> {
  readonly name: "ExpriedClaim"
  readonly by: UCAN.DID
  readonly to: UCAN.DID

  readonly claim: C

  expiredAt: Time
}

interface InactiveClaim<C> {
  readonly name: "InactiveClaim"
  readonly from: UCAN.DID
  readonly to: UCAN.DID

  readonly claim: C

  activeAt: Time
}

interface UnfundedClaim<C> {
  readonly name: "UnfundedClaim"
  readonly claim: C

  readonly by: UCAN.DID
  readonly to: UCAN.DID
}

interface ViolatingClaim<C> {
  readonly name: "ViolatingClaim"
  readonly from: UCAN.DID
  readonly to: UCAN.DID

  readonly claim: C
  readonly escalates: EscalationError<C>[]
}

export interface Access<C> {
  ok: true
  capability: C
  to: UCAN.DIDView
  proof: Authorization<C>
}

export interface Authorization<C> {
  by: UCAN.DIDView
  granted: C[]

  proof: Authorization<C> | null
}

export interface UCANView<C extends CapabilityView> {
  ucan: UCAN.View
  capabilityParser: CapabilityParser<C>
  capabilities: C[]

  // capabilities that parser was unable to parse
  unkownCapabilities: IterableIterator<UCAN.Capability>
}

export interface CapabilityParser<C> {
  /**
   * Returns either succesfully parsed capability or unknown capability back
   */
  parse(capability: UCAN.Capability): Result<C, UnknownCapability>
}

interface UnknownCapability extends Error {
  capability: UCAN.Capability
}

type Time = number

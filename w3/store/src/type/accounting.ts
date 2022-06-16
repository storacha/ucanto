import { DID, Link, LinkedProof, Result, Await } from "@ucanto/interface"
import { ServiceError } from "./error"
export type Error = QuotaViolationError

export interface QuotaViolationError
  extends ServiceError<"QuotaViolationError"> {}

export interface Provider {
  /**
   * Upload service will call this once it verified the UCAN and checked that
   * `group` is associated with some account. Provider will record link to
   * group association for the future accounting.
   *
   * @param group
   * @param link
   * @param proof
   */
  add(
    group: DID,
    link: Link<unknown, number, number, 0 | 1>,
    proof: LinkedProof
  ): Await<Result<LinkState, Error>>

  remove(
    group: DID,
    link: Link<unknown, number, number, 0 | 1>,
    proof: LinkedProof
  ): Await<Result<null, never>>

  list(
    gorup: DID,
    proof: LinkedProof
  ): Await<Result<Link<unknown, number, number, 0 | 1>[], never>>
}

interface LinkState {
  status: "in-s3" | "not-in-s3"
}

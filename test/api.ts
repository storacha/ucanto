export * from "../src/api.js"
import * as API from "../src/api.js"
import type { DID, Link, Await } from "@ipld/dag-ucan"

export type { DID, Link }
export type Result<T extends unknown = unknown, X = Error> = Await<
  API.Result<T, X>
>

export interface StorageProvider {
  /**
   * Service will call this once it verified the UCAN to associate link with a
   * given DID. Service is unaware if given `DID` is associated with some account
   * or not, if it is not `StoreProvider` MUST return `UnauthorizedDIDError`.
   */
  add(
    group: DID,
    link: Link,
    proof: Link
  ): Result<AddStatus, UnauthorizedDIDError | QuotaViolationError>
  remove(
    group: DID,
    link: Link,
    proof: Link
  ): Result<undefined, UnauthorizedDIDError | DoesNotHasError>
}

export interface TokenStore {
  /**
   * Revokes set of UCANS. CID corresponds to the link been revoked and
   * proof is the CID of the revocation.
   */
  revoke(token: Link, revocation: TokenEntry): Result<void, Error>

  /**
   * Adds bunch of proofs for later queries.
   */
  insert(tokens: IterableIterator<TokenEntry>): Result<undefined, Error>

  /**
   * You give it named set of CIDs and it gives you back named set of
   * corresponding UCANs or an error describing it.
   */
  select<Query extends Record<string, Link>>(
    query: Query
  ): Await<SelectResult<Query>>

  gc(): Await<void>
}

export type SelectResult<Q> = {
  [Key in keyof Q]: Found | NotFoundError | RevokedError | ExpiredError
}

export interface TokenEntry {
  cid: Link
  bytes: Uint8Array
  ttl: number
}

export interface Found {
  status: "ok"
  ok: true

  ttl: number
  cid: Link
  bytes: Uint8Array
}

export interface NotFoundError extends Error {
  ok: false
  status: "not-found"
  cid: Link
}

/**
 * UCAN with given cid has been revoked
 */
export interface RevokedError extends Error {
  ok: false
  status: "revoked"

  // revocation CID
  proof: Link

  // TTL of the UCAN that was revoked
  ttl: number | null
  cid: Link

  // maybe be revoked even before we have seen it.
  bytes: Uint8Array | null
}

/**
 * UCAN has expired.
 */
export interface ExpiredError extends Error {
  ok: false
  status: "expired"
  cid: Link

  // when did token expire
  expiry: number
}

export interface AccessProvider {
  /**
   * Associates a DID with another DID in the system. If there is no account
   * associated with a `to` DID will produce an error.
   */
  link(member: DID, group: DID, proof: Link): Result<undefined, UnknownDIDError>

  unlink(
    member: DID,
    group: DID,
    proof: Link
  ): Result<undefined, UnknownDIDError>

  /**
   * Associates new child DID with an accound of the parent DID. If there is no
   * account associated with a parent it creates account with `parent` did first
   * and then associates child DID with it.
   */
  register(member: DID, group: DID, proof: Link): Result<undefined, never>
}

export interface AddStatus {
  /**
   * Should be `ok` if we already have car and we don't need to perform upload.
   * Otherwise should be `pending`.
   */
  status: "in-s3" | "not-in-s3"
}

export interface ProofNotFoundError extends Error {
  cid: Link
}

export interface QuotaViolationError extends Error {
  group: DID
  link: Link
}

export interface UnauthorizedDIDError extends Error {}

export interface DoesNotHasError extends RangeError {}

export interface UnknownDIDError extends RangeError {}

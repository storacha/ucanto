import * as UCAN from "@ipld/dag-ucan"

export type { DID } from "@ipld/dag-ucan"

export interface Authority<A extends number = number>
  extends ArrayBufferView,
    UCAN.Agent,
    Verifier<A> {
  bytes: Uint8Array
}

export interface SigningAuthority<A extends number = number>
  extends ArrayBufferView,
    UCAN.Agent,
    Verifier<A>,
    Signer<A> {
  authority: Authority<A>
  bytes: Uint8Array
  secret: Uint8Array
}

/**
 * Represents an entity that can verify signature. Type paramater `A` represents
 * a code from multiformat table describing cryptographic algorithm.
 */
export interface Verifier<A extends number = number> {
  /**
   * Takes byte encoded payload and verifies that it is signed by corresponding
   * signer.
   */
  verify<T>(payload: ByteView<T>, signature: Signature<T, A>): Await<boolean>
}

/**
 * Represents an entity that can sign a payload. Type parameter `A` represents
 * a code from multiformat table describingy cryptographic algorithm.
 */
export interface Signer<A extends number = number> {
  /**
   * Takes byte encoded payload and produces a verifiable signature.
   */
  sign<T>(payload: ByteView<T>): Await<Signature<T, A>>
}

/**
 * Represents cryptographic signature. Type parameter `T` represents a structure
 * which was byte encoded before it was signed. Type parameter `A` represents
 * a code from multiformat table describingy cryptographic algorithm.
 */
export interface Signature<T = unknown, A extends number = number>
  extends ByteView<T> {
  algorithm?: A
}

/**
 * Just like `Verifier` except definitely async.
 */
export interface AsyncVerifier<A extends number> {
  verify<T>(
    payload: ByteView<T>,
    signature: Signature<T, A>
  ): PromiseLike<boolean>
}

/**
 * Just like Verifier` but definitely sync.
 */
export interface SyncVerifier<A extends number> {
  verify<T>(payload: ByteView<T>, signature: Signature<T, A>): boolean
}

export interface SyncSigner<A extends number = number> {
  sign<T>(payload: ByteView<T>): Signature<T, A>
}

export interface AsyncSigner<A extends number = number> {
  sign<T>(payload: ByteView<T>): PromiseLike<Signature<T, A>>
}

/**
 * Represents byte encoded representation of the `Data`. It uses type parameter
 * to capture the structure of the data it encodes.
 */
export interface ByteView<Data> extends Uint8Array, Phantom<Data> {}

export type Await<T> = T | PromiseLike<T>

/**
 * This is an utility type to retain unused type parameter `T`. It can be used
 * as nominal type e.g. to capture semantics not represented in actual type strucutre.
 */
export interface Phantom<T> {
  // This field can not be represented because field name is non-existings
  // unique symbol. But given that field is optional any object will valid
  // type contstraint.
  [PhantomKey]?: T
}

declare const PhantomKey: unique symbol

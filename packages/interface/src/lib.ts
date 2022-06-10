import * as UCAN from "@ipld/dag-ucan"
import type * as Transport from "./transport.js"
import type { Tuple } from "./transport.js"
import type {
  Authority,
  SigningAuthority,
  AuthorityParser,
} from "./authority.js"
import type {
  Phantom,
  Encoded,
  Link,
  Issuer,
  Capability,
  Identity,
  Audience,
  MultihashHasher,
  DID,
  ByteView,
} from "@ipld/dag-ucan"

export type {
  MultibaseEncoder,
  MultibaseDecoder,
} from "multiformats/bases/interface"

export type {
  UCAN,
  Transport,
  Encoded,
  Link,
  Issuer,
  Audience,
  Capability,
  Identity,
  ByteView,
  Phantom,
}

export * from "./transport.js"
export * from "./authority.js"

/**
 * Proof can either be a link to a delegated UCAN or a materialized `Delegation`
 * view.
 */
export type Proof<
  C extends [Capability, ...Capability[]] = [Capability, ...Capability[]]
> = UCAN.Proof<C[number]> | Delegation<C>

export interface DelegationOptions<
  C extends [Capability, ...Capability[]],
  A extends number = number
> {
  issuer: SigningAuthority<A>
  audience: Identity
  capabilities: C
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  nonce?: string

  facts?: UCAN.Fact[]
  proofs?: Proof[]
}

export interface Delegation<
  C extends [Capability, ...Capability[]] = [Capability, ...Capability[]]
> {
  readonly root: Transport.Block<C>
  readonly blocks: Map<string, Transport.Block>

  readonly cid: UCAN.Proof<C[number]>
  readonly bytes: UCAN.ByteView<UCAN.UCAN<C[number]>>
  readonly data: UCAN.View<C[number]>

  asCID: UCAN.Proof<Capability>

  export(): IterableIterator<Transport.Block>

  issuer: Identity
  audience: Identity
  capabilities: C
  expiration?: number
  notBefore?: number

  nonce?: string

  facts: UCAN.Fact[]
  proofs: Proof[]
}

export interface Invocation<
  Capability extends UCAN.Capability = UCAN.Capability
> extends Delegation<[Capability]> {}

export interface InvocationOptions<
  Capability extends UCAN.Capability = UCAN.Capability
> {
  issuer: SigningAuthority
  audience: Audience
  capability: Capability
  proofs?: Proof[]
}

export interface IssuedInvocation<
  Capability extends UCAN.Capability = UCAN.Capability
> extends DelegationOptions<[Capability]> {
  readonly issuer: SigningAuthority
  readonly audience: Identity
  readonly capabilities: [Capability]

  readonly proofs: Proof[]
}

export type ServiceInvocation<
  C extends Capability = Capability,
  S = InvocationService<C>
> = IssuedInvocation<C> & ServiceInvocations<S>

export type InferInvocation<T extends ServiceInvocation> =
  T extends ServiceInvocation<infer C> ? Invocation<C> : never

export type InferInvocations<T> = T extends []
  ? []
  : T extends [ServiceInvocation<infer C>, ...infer Rest]
  ? [Invocation<C>, ...InferInvocations<Rest>]
  : T extends Array<IssuedInvocation<infer U>>
  ? Invocation<U>[]
  : never

export interface ServiceMethod<
  C extends Capability,
  T,
  X extends { error: true }
> {
  (input: Invocation<C>): Await<Result<T, X>>
}

export type ResolveServiceMethod<
  S extends Record<string, any>,
  Path extends string
> = Path extends `${infer Base}/${infer SubPath}`
  ? ResolveServiceMethod<S[Base], SubPath>
  : S[Path] extends ServiceMethod<infer _C, infer _T, infer _X>
  ? S[Path]
  : never

export type ResolveServiceInvocation<
  S extends Record<string, any>,
  C extends Capability
> = ResolveServiceMethod<S, C["can"]> extends ServiceMethod<
  infer C,
  infer _T,
  infer _X
>
  ? IssuedInvocation<C>
  : never

export type InferServiceInvocationReturn<
  C extends Capability,
  S
> = ResolveServiceMethod<S, C["can"]> extends ServiceMethod<
  infer _,
  infer T,
  infer X
>
  ? Result<T, X | HandlerNotFound | HandlerExecutionError>
  : never

export type InferServiceInvocations<I extends unknown[], T> = I extends []
  ? []
  : I extends [ServiceInvocation<infer C, T>, ...infer Rest]
  ? [InferServiceInvocationReturn<C, T>, ...InferServiceInvocations<Rest, T>]
  : never

export interface IssuedInvocationView<
  Capability extends UCAN.Capability = UCAN.Capability
> extends IssuedInvocation<Capability> {
  execute<T extends InvocationService<Capability>>(
    service: Connection<T>
  ): Await<InferServiceInvocationReturn<Capability, T>>
}

export interface Batch<In extends unknown[]> {
  invocations: In
}

export interface BatchView<In extends [unknown, ...unknown[]]>
  extends Batch<In> {
  execute<T>(connection: Connection<T>): Await<ExecuteBatchInvocation<In, T>>
}

export interface IssuedBatchInvocationView<In extends IssuedInvocation[]> {
  invocations: In
  delegations: UCAN.View[]
  execute<T extends BatchInvocationService<In>>(
    service: Connection<T>
  ): ExecuteBatchInvocation<In, T>
}

export type BatchInvocationService<In> = In extends [Invocation<infer C>, ...[]]
  ? InvocationService<C>
  : In extends [Invocation<infer C>, ...infer Rest]
  ? InvocationService<C> & BatchInvocationService<Rest>
  : {}

export type ExecuteBatchInvocation<In, T> = In extends [
  Invocation<infer C> | IssuedInvocation<infer C>,
  ...[]
]
  ? [Awaited<ExecuteInvocation<C, T>>]
  : In extends [Invocation<infer C> | IssuedInvocation<infer C>, ...infer Rest]
  ? [Awaited<ExecuteInvocation<C, T>>, ...ExecuteBatchInvocation<Rest, T>]
  : never

export type ServiceInvocations<T> = IssuedInvocation<any> &
  {
    [Key in keyof T]: SubServiceInvocations<T[Key], Key & string>
  }[keyof T]

type SubServiceInvocations<T, Path extends string> = {
  [Key in keyof T]: T[Key] extends ServiceMethod<infer C, infer _R, infer _X>
    ? IssuedInvocation<C>
    : SubServiceInvocations<Path, Key & string>
}[keyof T]

export type InvocationService<
  Capability extends UCAN.Capability,
  Ability extends string = Capability["can"]
> = Ability extends `${infer Base}/${infer Path}`
  ? { [Key in Base]: InvocationService<Capability, Path> }
  : {
      [Key in Ability]: ServiceMethod<Capability, any, any>
    }

export type ExecuteInvocation<
  Capability extends UCAN.Capability,
  T extends Record<string, any>,
  Ability extends string = Capability["can"]
> = Ability extends `${infer Base}/${infer Path}`
  ? ExecuteInvocation<Capability, T[Base], Path>
  : T[Ability] extends (input: Invocation<Capability>) => infer Out
  ? Out
  : never

export type Result<T, X extends { error: true }> =
  | (T extends null | undefined ? T : never)
  | (T & { error?: never })
  | X

export interface Failure extends Error {
  error: true
}

export interface HandlerNotFound extends RangeError {
  error: true
  capability: Capability
  name: "HandlerNotFound"
}

export interface HandlerExecutionError extends Failure {
  capability: Capability
  cause: Error
  name: "HandlerExecutionError"
}

export type API<T> = T[keyof T]

export interface ConnectionOptions<T> extends Transport.EncodeOptions {
  readonly encoder: Transport.RequestEncoder
  readonly decoder: Transport.ResponseDecoder
  readonly channel: Transport.Channel<T>
}

export interface Connection<T> extends UCAN.Phantom<T> {
  readonly encoder: Transport.RequestEncoder
  readonly decoder: Transport.ResponseDecoder
  readonly channel: Transport.Channel<T>

  readonly hasher: MultihashHasher
}

export interface ConnectionView<T> extends Connection<T> {
  execute<
    C extends Capability,
    I extends Transport.Tuple<ServiceInvocation<C, T>>
  >(
    ...invocations: I
  ): Await<InferServiceInvocations<I, T>>
}

export interface Server<T> extends UCAN.Phantom<T> {
  /**
   * Request decoder which is will be used by a server to decode HTTP Request
   * into an invocation `Batch` that will be executed using a `service`.
   */
  readonly decoder: Transport.RequestDecoder
  /**
   * Response encoder which will be used to encode batch of invocation results
   * into an HTTP response that will be send back to the client that initiated
   * request.
   */
  readonly encoder: Transport.ResponseEncoder

  /**
   * Takes authority parser that can be used to turn an `UCAN.Identity`
   * into `Ucanto.Authority`.
   */
  readonly authorizer?: AuthorityParser

  /**
   * Actual service providing capability handlers.
   */
  readonly service: T
}

export interface ServerView<T> extends Server<T>, Transport.Channel<T> {}

export type Service = Record<
  string,
  (input: Invocation<any>) => Promise<Result<any, any>>
>

export type Await<T> = T | PromiseLike<T> | Promise<T>

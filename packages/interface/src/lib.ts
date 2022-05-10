import * as UCAN from "@ipld/dag-ucan"
import type * as Transport from "./transport.js"
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
export type Proof<C extends UCAN.Capability = UCAN.Capability> =
  | UCAN.Proof<C>
  | Delegation<C>

export interface DelegationOptions<C extends Capability, A extends number> {
  issuer: SigningAuthority<A>
  audience: Authority
  capabilities: C[]
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  nonce?: string

  facts?: UCAN.Fact[]
  proofs?: Proof[]
}

export interface Delegation<
  Capability extends UCAN.Capability = UCAN.Capability
> {
  readonly data: UCAN.View<Capability>
  readonly cid: UCAN.Proof<Capability>
  readonly bytes: UCAN.ByteView<UCAN.UCAN<Capability>>

  export(): IterableIterator<Transport.Block>

  issuer: Authority
  audience: Authority
  capabilities: Capability[]
  expiration?: number
  notBefore?: number

  nonce?: string

  facts: UCAN.Fact[]
  proofs: Proof[]
}

export interface Invocation<
  Capability extends UCAN.Capability = UCAN.Capability
> extends Delegation {
  readonly capability: Capability
}

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
> {
  readonly issuer: SigningAuthority
  readonly audience: Audience
  readonly capability: Capability

  readonly proofs: Proof[]
}

export interface IssuedInvocationView<
  Capability extends UCAN.Capability = UCAN.Capability
> extends IssuedInvocation<Capability> {
  execute<T extends InvocationService<Capability>>(
    service: Connection<T>
  ): Await<ExecuteInvocation<Capability, T>>
}

export interface Batch<In extends unknown[]> {
  invocations: In
}

export interface BatchView<In extends unknown[]> extends Batch<In> {
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
  Invocation<infer C>,
  ...[]
]
  ? [Awaited<ExecuteInvocation<C, T>>]
  : In extends [Invocation<infer C>, ...infer Rest]
  ? [Awaited<ExecuteInvocation<C, T>>, ...ExecuteBatchInvocation<Rest, T>]
  : never

export type ServiceInvocations<T> = Invocation &
  {
    [Key in keyof T]: SubServiceInvocations<T[Key], Key & string>
  }[keyof T]

type SubServiceInvocations<T, Path extends string> = {
  [Key in keyof T]: T[Key] extends (
    input: Invocation<infer Capability>
  ) => Await<Result<any, any>>
    ? Invocation<Capability>
    : SubServiceInvocations<Path, Key & string>
}[keyof T]

export interface InvocationView<
  Capability extends UCAN.Capability = UCAN.Capability
> extends Invocation<Capability> {
  execute<T extends InvocationService<Capability>>(
    service: Connection<T>
  ): ExecuteInvocation<Capability, T>
}

export type InvocationService<
  Capability extends UCAN.Capability,
  Ability extends string = Capability["can"]
> = Ability extends `${infer Base}/${infer Path}`
  ? { [Key in Base]: InvocationService<Capability, Path> }
  : {
      [Key in Ability]: (
        input: Invocation<Capability>
      ) => Await<Result<any, any>>
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

export type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | (E & { ok?: false })

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

export interface ConnectionView<T> extends Connection<T> {}

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
  readonly authorizer: AuthorityParser

  /**
   * Actual service providing capability handlers.
   */
  readonly service: T
}

export interface ServerView<T> extends Server<T>, Transport.Channel<T> {
  execute<I extends ServiceInvocations<T>[]>(
    batch: Batch<I>
  ): Await<ExecuteBatchInvocation<I, T>>
}

export type Service = Record<
  string,
  (input: Invocation<any>) => Promise<Result<any, any>>
>

export type Await<T> = T | PromiseLike<T> | Promise<T>

import * as UCAN from "@ipld/dag-ucan"
import type * as Transport from "./transport.js"
import type {
  Phantom,
  Block,
  Encoded,
  Link,
  Issuer,
  Capability,
  Agent,
  MultihashHasher,
} from "@ipld/dag-ucan"

export type {
  UCAN,
  Transport,
  Phantom,
  Block,
  Encoded,
  Link,
  Issuer,
  Capability,
  Agent,
}

/**
 * Proof can either be a link to a delegated UCAN or a materialized `Delegation`
 * view.
 */
export type Proof<C extends UCAN.Capability = UCAN.Capability> =
  | UCAN.Proof<C>
  | Delegation<C>

export interface InvocationOptions<
  Capability extends UCAN.Capability = UCAN.Capability
> {
  issuer: Issuer
  audience: UCAN.Agent
  capability: Capability
  proofs?: Proof[]
}

export interface Invocation<
  Capability extends UCAN.Capability = UCAN.Capability
> {
  readonly issuer: UCAN.Agent
  readonly audience: UCAN.Agent
  readonly capability: Capability
  readonly data: UCAN.View

  proofs: Proof[]
}

export interface DelegationOptions<C extends Capability, A extends number> {
  issuer: Issuer<A>
  audience: Agent
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

  export(): IterableIterator<Transport.Block<Capability>>

  issuer: Agent
  audience: Agent
  capabilities: Capability[]
  expiration?: number
  notBefore?: number

  nonce?: string

  facts: UCAN.Fact[]
  proofs: Proof<Capability>[]
}

export interface IssuedInvocation<
  Capability extends UCAN.Capability = UCAN.Capability
> extends Invocation<Capability> {
  issuer: UCAN.Issuer
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
  readonly decoder: Transport.RequestDecoder
  readonly encoder: Transport.ResponseEncoder
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

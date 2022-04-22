import * as UCAN from "@ipld/dag-ucan"
import type * as Transport from "./transport/api.js"
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

export interface Invocation<
  Capability extends UCAN.Capability = UCAN.Capability
> {
  readonly issuer: Agent
  readonly audience: Agent
  readonly capability: Capability

  proofs?: Proof[]
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
  ): ExecuteInvocation<Capability, T>
}

export interface Batch<In extends unknown[]> {
  invocations: In

  // execute<T extends BatchInvocationService<In>>(
  //   service: T
  // ): ExecuteBatchInvocation<In, T>
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

type StoreAdd = (
  input: Invocation<{ can: "store/add"; with: UCAN.DID; link: UCAN.Link }>
) => Result<
  | { status: "done"; with: UCAN.DID; link: UCAN.Link }
  | { status: "pending"; with: UCAN.DID; link: UCAN.Link; url: string }
>

type StoreRemove = (
  input: Invocation<{ can: "store/remove"; with: UCAN.DID; link: UCAN.Link }>
) => Result<boolean>

type Store = {
  add: StoreAdd
  remove: StoreRemove
}

export type API<T> = T[keyof T]
// {
//   [Key in keyof T]: T[Key] extends Method<infer In, infer Out>
//     ? { In: In; Out: Out }
//     : never
// }[keyof T]

export interface ConnectionOptions extends Transport.EncodeOptions {
  readonly encoder: Transport.RequestEncoder
  readonly decoder: Transport.ResponseDecoder
  readonly channel: Transport.Channel
}

export interface Connection<T> extends UCAN.Phantom<T> {
  readonly encoder: Transport.RequestEncoder
  readonly decoder: Transport.ResponseDecoder
  readonly channel: Transport.Channel

  readonly hasher: MultihashHasher
}

export interface ConnectionView<T> extends Connection<T> {}

export interface Handler<T> extends UCAN.Phantom<T> {
  readonly decoder: Transport.RequestDecoder
  readonly encoder: Transport.ResponseEncoder
  readonly service: T
}
export interface HandlerView<T> extends Handler<T> {
  execute<I extends ServiceInvocations<T>[]>(
    batch: Batch<I>
  ): Await<ExecuteBatchInvocation<I, T>>

  handle<I extends ServiceInvocations<T>[]>(
    request: Transport.HTTPRequest<Batch<I>>
  ): Await<Transport.HTTPResponse<ExecuteBatchInvocation<I, T>>>
}
export declare function connection<T>(): Connection<T>

export type Service = Record<
  string,
  (input: Invocation<any>) => Promise<Result<any, any>>
>

export type Await<T> = T | PromiseLike<T> | Promise<T>

export declare function invoke<Capability extends UCAN.Capability>(
  input: IssuedInvocation<Capability>
): IssuedInvocationView<Capability>

export declare function batch<In extends IssuedInvocation[]>(
  ...input: In
): IssuedBatchInvocationView<In>

export type QueryInput = {
  [K in string]: Select | QueryInput
}

interface Select<In extends Input = Input, S extends Selector = Selector> {
  input: In
  selector: S
}

export type Selector =
  | true
  | {
      [K in string]: Selector
    }

export interface Query<In extends QueryInput> {
  input: In

  queryService(): QueryService<In>

  execute<T extends QueryService<In>>(
    service: Connection<T>
  ): ExecuteQuery<In, T>
}

type ExecuteQuery<In extends QueryInput, Service extends QueryService<In>> = {
  [Key in keyof In & keyof Service & string]: ExecuteSubQuery<
    Key,
    In[Key],
    Service[Key]
  >
}

type ExecuteSubQuery<Path extends string, In, Service> = {
  [Key in keyof In & keyof Service & string]: In[Key] extends Select<
    infer Input,
    infer Selector
  >
    ? Service[Key] extends InstructionHandler<
        `${Path}/${Key}`,
        Input,
        infer T,
        infer X
      >
      ? ExecuteSelect<Selector, T, X>
      : never
    : ExecuteSubQuery<`${Path}/${Key}`, In[Key], Service[Key]>
}

type ExecuteSelect<S extends Selector, T, X extends Error> = S extends true
  ? Result<T, X>
  : Result<ExecuteSubSelect<S, T>, X>

type ExecuteSubSelect<Selector, T> = T extends infer E | infer U
  ? Pick<E, keyof Selector & keyof E> | Pick<U, keyof Selector & keyof U>
  : Pick<T, keyof Selector & keyof T>

type QueryService<In extends QueryInput> = {
  [Key in keyof In & string]: SubService<Key, In[Key]>
}

type SubService<Path extends string, In> = {
  [Key in keyof In & string]: In[Key] extends Select<infer In, infer Selector>
    ? InstructionHandler<`${Path}/${Key}`, In, Matches<Selector>>
    : SubService<`${Path}/${Key}`, In[Key]>
}

export type Matches<S extends Selector> = S extends true
  ? unknown
  : {
      [Key in keyof S]: S[Key] extends Selector ? Matches<S[Key]> : unknown
    }

export type InstructionHandler<
  Ability extends UCAN.Ability = UCAN.Ability,
  In extends Input = Input,
  T = unknown,
  X extends Error = Error
> = (instruction: Invocation<In & { can: Ability }>) => Result<T, X>

export declare function query<In extends QueryInput>(query: In): Query<In>

export interface Input<Resource extends UCAN.Resource = UCAN.Resource> {
  with: Resource

  proofs?: Proof[]
}

export declare function select<In extends Input, S extends Selector = true>(
  input: In,
  selector?: S
): S extends true ? Select<In, true> : Select<In, S>

type Match<In extends Invocation, T extends Service> = {
  [Key in keyof T]: T[Key] extends (input: In) => infer Out ? Out : never
}[keyof T]

declare var store: Store
declare var channel: Connection<{ store: Store }>
declare const alice: UCAN.Issuer
declare const bob: Agent
declare const car: UCAN.Link

type ToPath<T extends string> = T extends `${infer Base}/${infer Path}`
  ? [Base, ...ToPath<Path>]
  : [T]

type A = ToPath<"">
type B = ToPath<"foo">
type C = ToPath<"foo/bar">

type Unpack<T> = T extends infer A & infer B ? [A, B] : []

type U = Unpack<StoreAdd & StoreRemove>

// store({
//   issuer: alice,
//   audence: bob.did(),
//   capabilities: [
//     {
//       with: alice.did(),
//       can: 'store/add',
//       link: car,
//     },
//   ],
// })

const add = invoke({
  issuer: alice,
  audience: bob,
  capability: {
    can: "store/add",
    with: alice.did(),
    link: car,
  },
})

const remove = invoke({
  issuer: alice,
  audience: bob,
  capability: {
    can: "store/remove",
    with: alice.did(),
    link: car,
  },
})

{
  const [a, b] = batch(add, remove).execute(channel)
}

const result = add.execute(channel)
if (result.ok) {
  result.value
}

declare var host: Connection<{ store: Store }>

const q = query({
  store: {
    add: select(
      {
        with: alice.did(),
        link: car,
        proofs: [],
      },
      {
        link: true,
      }
    ),
    remove: select({
      with: alice.did(),
      link: car,
    }),
  },
})

const r2 = q.queryService().store.remove({
  issuer: alice,
  audience: bob,
  capability: {
    can: "store/remove",
    with: alice.did(),
    link: car,
  },
})

const r3 = q.execute(host)
if (r3.store.add.ok) {
  if (r3.store.add.value) {
  }
}

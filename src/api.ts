import type * as UCAN from '@ipld/dag-ucan'
import type * as Transport from './client/transport/api.js'
export type { Phantom, Block, Encoded } from '@ipld/dag-ucan'
export type { UCAN, Transport }

// import type { Link, ByteView, DID } from '@ipld/dag-ucan'
// import type { sha256 } from 'multiformats/hashes/sha2'
// import { Capability } from 'ucan-storage/types'

// export type Query<Service> = Partial<{
//   [Key in keyof Service]: Service[Key] extends Method<infer In, infer Out>
//     ? Handler<In, Out>
//     : Query<Service[Key]>
// }>

// export interface Method<In extends UCAN.Capability, Out> {
//   (invocation: Instruction<In>): Result<Out>
// }

// export type Input<Service> = Service[keyof Service] extends Method<
//   infer In,
//   infer Out
// >
//   ? Instruction<In>
//   : never

// export type Return<
//   Service,
//   In extends UCAN.Capability
// > = Service[keyof Service] extends Method<In, infer Out> ? Out : { In: In }

// export type Handler<In extends UCAN.Capability, Out> = [
//   Instruction<In>,
//   Selector<Out>
// ]

// export type Selector<Out> = Partial<{
//   [Key in keyof Out]: unknown | Selector<Out[Key]>
// }>

export interface Route {
  readonly issuer: UCAN.Issuer
  readonly audience: UCAN.Audience
}

export type Proof<C extends UCAN.Capability = UCAN.Capability> =
  | UCAN.Proof<C>
  | UCAN.View<C>

export interface Instruction<T extends UCAN.Capability = UCAN.Capability> {
  issuer: UCAN.DID
  audience: UCAN.DID
  capabilities: [T]

  proofs?: Proof[]
}

export interface Invocation<
  Capability extends UCAN.Capability = UCAN.Capability
> {
  readonly capability: Capability
  readonly issuer: UCAN.Audience
  readonly audience: UCAN.Audience

  proofs?: Proof[]
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
  delegations: Map<string, UCAN.View>
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
  : In

export type ExecuteBatchInvocation<In, T> = In extends [
  Invocation<infer C>,
  ...[]
]
  ? [ExecuteInvocation<C, T>]
  : In extends [Invocation<infer C>, ...infer Rest]
  ? [ExecuteInvocation<C, T>, ...ExecuteBatchInvocation<Rest, T>]
  : never

export interface InvocationView<
  Capability extends UCAN.Capability = UCAN.Capability
> extends Invocation<Capability> {
  execute<T extends InvocationService<Capability>>(
    service: Connection<T>
  ): ExecuteInvocation<Capability, T>
}

export type InvocationService<
  Capability extends UCAN.Capability,
  Ability extends string = Capability['can']
> = Ability extends `${infer Base}/${infer Path}`
  ? { [Key in Base]: InvocationService<Capability, Path> }
  : {
      [Key in Ability]: (
        input: Instruction<Capability>
      ) => Await<Result<any, any>>
    }

export type ExecuteInvocation<
  Capability extends UCAN.Capability,
  T extends Record<string, any>,
  Ability extends string = Capability['can']
> = Ability extends `${infer Base}/${infer Path}`
  ? ExecuteInvocation<Capability, T[Base], Path>
  : T[Ability] extends (input: Instruction<Capability>) => infer Out
  ? Out
  : never

export type Result<T, X = Error> =
  | { ok: true; value: T }
  | { ok: false; error: X }

type StoreAdd = (
  input: Instruction<{ can: 'store/add'; with: UCAN.DID; link: UCAN.Link }>
) => Result<
  | { status: 'done'; with: UCAN.DID; link: UCAN.Link }
  | { status: 'pending'; with: UCAN.DID; link: UCAN.Link; url: string }
>

type StoreRemove = (
  input: Instruction<{ can: 'store/remove'; with: UCAN.DID; link: UCAN.Link }>
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

export interface ConnectionOptions {
  readonly codec: Transport.Encoder
}

export interface Connection<T> extends UCAN.Phantom<T> {
  codec: Transport.Codec
}

export declare function connection<T>(): Connection<T>

export declare function query<Service, Input extends QueryInput>(
  config: Connection<Service>,
  query: Input //: QueryResult<Service, Input>
): Promise<Result<Input, Service>>

export type Service = Record<
  string,
  (input: Instruction<any>) => Promise<Result<any, any>>
>

export type Await<T> = T | PromiseLike<T> | Promise<T>

// export declare function invoke<In extends Invoke, T extends Service>(
//   connection: Connection<T>,
//   input: In
// ): {
//   [Key in keyof T]: T[Key] extends (input: ToInstruction<In>) => infer Out
//     ? Out
//     : never
// }[keyof T]

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
    ? Service[Key] extends Handler<`${Path}/${Key}`, Input, infer T, infer X>
      ? ExecuteSelect<Selector, T, X>
      : never
    : ExecuteSubQuery<`${Path}/${Key}`, In[Key], Service[Key]>
}

type ExecuteSelect<S extends Selector, T, X> = S extends true
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
    ? Handler<`${Path}/${Key}`, In, Matches<Selector>>
    : SubService<`${Path}/${Key}`, In[Key]>
}

export type Matches<S extends Selector> = S extends true
  ? unknown
  : {
      [Key in keyof S]: S[Key] extends Selector ? Matches<S[Key]> : unknown
    }

export type Handler<
  Ability extends UCAN.Ability = UCAN.Ability,
  In extends Input = Input,
  T = unknown,
  X = unknown
> = (instruction: Instruction<In & { can: Ability }>) => Result<T, X>

export declare function query<In extends QueryInput>(query: In): Query<In>

export interface Input<Resource extends UCAN.Resource = UCAN.Resource> {
  with: Resource

  proofs?: Proof[]
}

export declare function select<In extends Input, S extends Selector = true>(
  input: In,
  selector?: S
): S extends true ? Select<In, true> : Select<In, S>

type Match<In extends Instruction, T extends Service> = {
  [Key in keyof T]: T[Key] extends (input: In) => infer Out ? Out : never
}[keyof T]

declare var store: Store
declare var channel: Connection<{ store: Store }>
declare const alice: UCAN.Issuer
declare const bob: UCAN.Audience
declare const car: UCAN.Link

type ToPath<T extends string> = T extends `${infer Base}/${infer Path}`
  ? [Base, ...ToPath<Path>]
  : [T]

type A = ToPath<''>
type B = ToPath<'foo'>
type C = ToPath<'foo/bar'>

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
    can: 'store/add',
    with: alice.did(),
    link: car,
  },
})

const remove = invoke({
  issuer: alice,
  audience: bob,
  capability: {
    can: 'store/remove',
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
  issuer: alice.did(),
  audience: bob.did(),
  capabilities: [
    {
      can: 'store/remove',
      with: alice.did(),
      link: car,
    },
  ],
})

const r3 = q.execute(host)
if (r3.store.add.ok) {
  if (r3.store.add.value) {
  }
}

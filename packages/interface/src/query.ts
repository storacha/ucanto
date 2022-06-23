import type {
  InvocationOptions,
  IssuedInvocation,
  IssuedInvocationView,
  Invocation,
  Proof,
  UCAN,
  Result,
  Connection,
  ConnectionView,
  Service,
  Authority,
  SigningAuthority,
  Failure,
} from './lib.js'

export type QueryInput = {
  [K in string]: Select | QueryInput
}

export interface Input<Resource extends UCAN.Resource = UCAN.Resource>
  extends Record<string, unknown> {
  with: Resource

  proofs?: Proof[]
}

export type InstructionHandler<
  Ability extends UCAN.Ability = UCAN.Ability,
  In extends Input = Input,
  T = unknown,
  X extends Failure = Failure
> = (instruction: Invocation<In & { can: Ability }>) => Result<T, X>

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

type ExecuteSelect<S extends Selector, T, X extends Failure> = S extends true
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

export declare function invoke<Capability extends UCAN.Capability>(
  input: InvocationOptions<Capability>
): IssuedInvocationView<Capability>

export declare function connection<T>(): Connection<T>

export declare function query<In extends QueryInput>(query: In): Query<In>
export declare function select<In extends Input, S extends Selector = true>(
  input: In,
  selector?: S
): S extends true ? Select<In, true> : Select<In, S>

type Match<In extends Invocation, T extends Service> = {
  [Key in keyof T]: T[Key] extends (input: In) => infer Out ? Out : never
}[keyof T]

type StoreAdd = (
  input: Invocation<{ can: 'store/add'; with: UCAN.DID; link: UCAN.Link }>
) => Result<
  | { status: 'done'; with: UCAN.DID; link: UCAN.Link }
  | { status: 'pending'; with: UCAN.DID; link: UCAN.Link; url: string },
  Failure
>

type StoreRemove = (
  input: Invocation<{ can: 'store/remove'; with: UCAN.DID; link: UCAN.Link }>
) => Result<boolean, Failure>

type Store = {
  add: StoreAdd
  remove: StoreRemove
}
declare var store: Store
declare var channel: ConnectionView<{ store: Store }>
declare const alice: SigningAuthority
declare const bob: Authority
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

declare var host: ConnectionView<{ store: Store }>

const demo = async () => {
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

  const a = add.execute(channel)
  const b = remove.execute(channel)

  const result = await add.execute(channel)
  if (!result.error) {
    result
  }

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

  const r3 = q.execute(host)
  if (!r3.store.add.error) {
    if (r3.store.add) {
    }
  }
}

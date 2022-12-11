import * as API from '@ucanto/interface'
export * from '@ucanto/interface'
import {
  UCAN,
  DID,
  Link,
  Signer,
  Delegation,
  CapabilityParser,
  TheCapabilityParser,
  Capability,
  InferCaveats,
  Match,
  Await,
  ParsedCapability,
  Ability as Can,
  InvocationError,
  Failure,
  Result,
  URI,
  Caveats,
  Verifier,
  Reader,
  Invocation,
  Proof,
  IssuedInvocationView,
} from '@ucanto/interface'

// This is the interface of the module we'll have
export interface AgentModule {
  create<ID extends DID>(options: CreateAgent<ID>): Agent<ID>

  resource<ID extends URI, Abilities extends ResourceAbilities>(
    resource: Reader<ID>,
    abilities: Abilities
  ): Resource<ID, With<ID, Abilities>>

  ability<
    In,
    Out,
    Fail extends { error: true } = { error: true; message: string }
  >(
    input: Reader<In>,
    output: Reader<Result<Out, Fail>>
  ): Ability<In, Out, Fail>
}

export interface Ability<
  In extends unknown = unknown,
  Out extends unknown = unknown,
  Fail extends { error: true } = { error: true },
  With extends URI = URI
> {
  uri: With
  in: Reader<In>
  out: Reader<Result<Out, Fail>>
}

export interface Resource<
  ID extends URI,
  Abilities extends ResourceAbilities,
  Context extends {} = {}
> {
  from<At extends ID>(at: At): From<At, '', Abilities>
  query<Q extends Query<ID, Abilities>>(query: Q): Batch<Q>

  with<CTX>(context: CTX): Resource<ID, Abilities, Context & CTX>

  provide<P extends ProviderOf<Abilities, Context>>(
    provider: P
  ): Provider<ID, Abilities, Context>

  and<
    ID2 extends URI,
    Abilities2 extends ResourceAbilities,
    Context2 extends {}
  >(
    other: Resource<ID2, Abilities2, Context2>
  ): Resource<ID | ID2, Abilities & Abilities2, Context & Context2>
}

export interface Provider<
  ID extends URI = URI,
  Abilities extends ResourceAbilities = ResourceAbilities,
  Context extends {} = {}
> {
  uri: ID
  abilities: Abilities
  context: Context
}

type ProviderOf<
  Abilities extends ResourceAbilities = ResourceAbilities,
  Context extends {} = {}
> = {
  [K in keyof Abilities & string]: Abilities[K] extends Reader<
    Result<infer Out, infer Fail> & { uri: infer ID }
  >
    ? (uri: ID, context: Context) => Await<Result<Out, Fail>>
    : Abilities[K] extends Ability<infer In, infer Out, infer Fail, infer URI>
    ? (uri: URI, input: In, context: Context) => Await<Result<Out, Fail>>
    : Abilities[K] extends ResourceAbilities
    ? ProviderOf<Abilities[K], Context>
    : never
}

type With<
  ID extends URI,
  Abilities extends ResourceAbilities = ResourceAbilities
> = {
  [K in keyof Abilities & string]: Abilities[K] extends Reader<
    Result<infer Out, infer Fail>
  >
    ? Reader<Result<Out, Fail>> & { uri: ID }
    : Abilities[K] extends Ability<infer In, infer Out, infer Fail, URI>
    ? Ability<In, Out, Fail, ID>
    : Abilities[K] extends ResourceAbilities
    ? With<ID, Abilities[K]>
    : never
}

type Query<
  ID extends URI = URI,
  Abilities extends ResourceAbilities = ResourceAbilities
> =
  | {
      [K: PropertyKey]:
        | Selector<URI, API.Ability, unknown, unknown, { error: true }>
        | Selection<URI, API.Ability, unknown, unknown, { error: true }, any>
    }
  | [
      Selector<URI, API.Ability, unknown, unknown, { error: true }>,
      ...Selector<URI, API.Ability, unknown, unknown, { error: true }>[]
    ]

interface Batch<Q extends Query> {
  query: Query

  decode(): {
    [K in keyof Q]: Q[K] extends Selector<
      infer With,
      infer Can,
      infer In,
      infer Out,
      infer Fail
    >
      ? Result<Out, Fail>
      : Q[K] extends Selection<
          infer With,
          infer Can,
          infer In,
          infer Out,
          infer Fail,
          infer Query
        >
      ? Result<Out, Fail>
      : never
  }
}

export type From<
  At extends URI,
  Can extends string,
  Abilities extends ResourceAbilities
> = {
  [K in keyof Abilities & string]: Abilities[K] extends Reader<
    Result<infer Out, infer Fail>
  >
    ? () => Selector<At, K extends '*' ? K : `./${K}`, void, Out, Fail>
    : Abilities[K] extends Ability<infer In, infer Out, infer Fail>
    ? (input: Input<In>) => Selector<At, `${Can}/${K}`, In, Out, Fail>
    : Abilities[K] extends ResourceAbilities
    ? From<At, Can extends '' ? K : `${Can}/${K}`, Abilities[K]>
    : never
}

export type Input<T> =
  | T
  | Selector<URI, API.Ability, unknown, T, any>
  | Selection<URI, API.Ability, unknown, T, any, any>

export type ResourceAbilities = {
  [K: string]:
    | Reader<Result<unknown, { error: true }>>
    | Ability
    | ResourceAbilities
}

export interface Selector<
  At extends URI,
  Can extends API.Ability,
  In extends unknown,
  Out extends unknown,
  Fail extends { error: true }
> {
  with: At
  can: Can
  in: In

  encode(): Uint8Array

  decode(bytes: Uint8Array): Promise<Result<Out, Fail>>
  select<Q extends QueryFor<Out>>(
    query: Q
  ): Selection<At, Can, In, Select<Out, Q>, Fail, Q>

  invoke(options: InvokeOptions): IssuedInvocationView<{
    with: At
    can: Can
    nb: In
  }>
}

export interface InvokeOptions {
  issuer: Signer
  audience: API.Principal

  lifetimeInSeconds?: number
  expiration?: UCAN.UTCUnixTimestamp
  notBefore?: UCAN.UTCUnixTimestamp

  nonce?: UCAN.Nonce

  facts?: UCAN.Fact[]
  proofs?: Proof[]
}

export interface Selection<
  At extends URI,
  Can extends API.Ability,
  In extends unknown,
  Out extends unknown,
  Fail extends { error: true },
  Query
> extends Selector<At, Can, In, Out, Fail> {
  query: Query

  embed(): Promise<{
    link: Link<{ with: At; can: Can; in: In; query: Query }>
  }>
}

export type Select<Out, Query extends QueryFor<Out>> = {
  [K in keyof Query & keyof Out]: Query[K] extends true
    ? Out[K]
    : Query[K] extends object
    ? Select<Out[K], Query[K]>
    : never
}

type QueryFor<Out> = Partial<{
  [K in keyof Out]: true | QueryFor<Out[K]>
}>

export interface CreateAgent<ID extends DID> {
  /**
   * Signer will be used to sign all the invocation receipts and to check
   * principal alignment on incoming delegations.
   */
  signer: Signer<ID>
  /**
   * Agent may act on behalf of some other authority e.g. in case of
   * web3.storage we'd like to `root -> manager -> worker` chain of
   * command if this agents acts as `worker` it will need a delegation
   * chain it could use when signing receipts.
   *
   * @see https://github.com/web3-storage/w3protocol/issues/265
   */
  delegations?: Delegation[]
}

export interface AgentConnect<
  ID extends DID,
  Capabilities extends [CapabilityParser, ...CapabilityParser[]]
> {
  principal: Verifier<ID>

  delegations?: Delegation[]

  capabilities?: Capabilities
}

/**
 * @template ID - DID this agent has
 * @template Context - Any additional context agent will hold
 */
export interface Agent<
  ID extends DID = DID,
  Context extends {} = {},
  Provides = () => never
> {
  signer: Signer<ID>
  context: Context

  connect<
    ID extends DID,
    Capabilities extends [CapabilityParser, ...CapabilityParser[]]
  >(
    options: AgentConnect<ID, Capabilities>
  ): AgentConnection<ID, Capabilities>

  /**
   * Attaches some context to the agent.
   */
  with<Ext extends {}>(context: Ext): Agent<ID, Context & Ext>
  /**
   * Initialized agent with a given function which will extend the context with
   * a result.
   */
  init<Ext extends {}>(start: () => API.Await<Ext>): Agent<ID, Context & Ext>

  // provide<
  //   Can extends ProvidedAbility,
  //   With extends URI,
  //   NB extends Caveats,
  //   Out,
  //   Problem extends Failure
  // >(
  //   capability: CapabilityParser<
  //     Match<ParsedCapability<Can, With, InferCaveats<NB>>>
  //   >,
  //   handler: (
  //     input: HandlerInput<
  //       ParsedCapability<Can, With, InferCaveats<NB>>,
  //       Context
  //     >
  //   ) => Await<Result<Out, Problem>>
  // ): Agent<
  //   ID,
  //   Context,
  //   Provides &
  //     ((
  //       input: Capability<Can, With, InferCaveats<NB>>
  //     ) => Await<Result<Out, Problem | InvocationError>>)
  // >

  resource<ID extends URI, Abilities extends ResourceAbilities>(
    resource: Reader<ID>,
    abilities: Abilities
  ): Resource<ID, Abilities>
  invoke: Provides
}

export type QueryEndpoint<
  Capabilities extends [CapabilityParser, ...CapabilityParser[]]
> = Capabilities extends [CapabilityParser] ? never : never

export interface AgentConnection<
  ID extends DID,
  Capabilities extends [CapabilityParser, ...CapabilityParser[]]
> {
  did(): ID
}

export interface HandlerInput<T extends ParsedCapability, Context extends {}> {
  capability: T
  context: Context

  invocation: API.ServiceInvocation<T>
  agent: Agent<DID, Context>
}

export interface Application<
  Can extends ProvidedAbility = ProvidedAbility,
  With extends URI = URI,
  In extends object = {},
  Out extends Result<unknown, { error: true }> = Result<
    unknown,
    { error: true }
  >
> {
  can: Can
  with: With

  in: InferCaveats<In>
  out: Out
}

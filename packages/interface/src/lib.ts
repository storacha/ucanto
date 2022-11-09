import {
  Ability,
  Block as UCANBlock,
  ByteView,
  Capabilities,
  Capability,
  DID,
  Fact,
  Link as UCANLink,
  MultihashHasher,
  MultihashDigest,
  MultibaseDecoder,
  MultibaseEncoder,
  Phantom,
  Resource,
  Signature,
  Principal,
  Verifier,
  Signer as UCANSigner,
} from '@ipld/dag-ucan'
import { Link, Block as IPLDBlock } from 'multiformats'
import * as UCAN from '@ipld/dag-ucan'
import {
  CanIssue,
  Match,
  InvalidAudience,
  Unauthorized,
  UnavailableProof,
  ParsedCapability,
  CapabilityParser,
} from './capability.js'
import type * as Transport from './transport.js'
import type { Tuple, Block } from './transport.js'
export * from './capability.js'
export * from './transport.js'
export type {
  Transport,
  Principal,
  Phantom,
  Tuple,
  DID,
  Signature,
  ByteView,
  Capabilities,
  Capability,
  Fact,
  UCANBlock,
  UCANLink,
  Link,
  Link as IPLDLink,
  IPLDBlock,
  Block,
  Ability,
  Resource,
  MultihashDigest,
  MultihashHasher,
  MultibaseDecoder,
  MultibaseEncoder,
}
export * as UCAN from '@ipld/dag-ucan'

/**
 * Proof can either be a link to a delegated UCAN or a materialized {@link Delegation}
 * view.
 */
export type Proof<C extends Capabilities = Capabilities> =
  | UCANLink<C>
  | Delegation<C>

/**
 * UCAN creation options that apply to all UCAN types.
 * 
 * See {@link DelegationOptions} for options specific to capability delegation.
 * See {@link InvocationOptions} for options specific to invoking a capability.
 */
export interface UCANOptions {
  audience: Principal
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  nonce?: string

  facts?: Fact[]
  proofs?: Proof[]
}

/**
 * A {@link UCANOptions} instance that include options for delegating capabilities.
 */
export interface DelegationOptions<C extends Capabilities> extends UCANOptions {
  /** 
   * The `issuer` of a {@link Delegation} is the delegating party, 
   * or the {@link Principal} that has some capabilities that they wish to delegate 
   * the `audience` {@link Principal}. 
   * 
   */
  issuer: Signer
  
  /**
   * The `audience` for a {@link Delegation} is the party being delegated to, or the
   * {@link Principal} which will invoke the delegated {@link Capabilities} on behalf
   * of the `issuer`.
   */
  audience: Principal

  /**
   * The set of {@link Capabilities} being delegated.
   */
  capabilities: C
  
  /** 
   * If the `issuer` of this {@link Delegation} is not the resource owner / service provider,
   * for the delegated capabilities, the `proofs` array must contain valid {@link Proof}s 
   * containing delegations to the `issuer`.
   */
  proofs?: Proof[]
}

/**
 * A materialized view of a UCAN delegation, which can be encoded into a UCAN token and
 * used as proof for an invocation or further delegations.
 */
export interface Delegation<C extends Capabilities = Capabilities> {
  readonly root: UCANBlock<C>
  /**
   * Map of all the IPLD blocks that were included with this delegation DAG.
   * Usually this would be blocks corresponding to proofs, however it may
   * also contain other blocks e.g. things that `capabilities` or `facts` may
   * link.
   * It is not guaranteed to include all the blocks of this DAG, as it represents
   * a partial DAG of the delegation desired for transporting.
   *
   * Also note that map may contain blocks that are not part of this
   * delegation DAG. That is because `Delegation` is usually constructed as
   * view / selection over the CAR which may contain bunch of other blocks.
   */
  readonly blocks: Map<string, Block>

  readonly cid: UCANLink<C>
  readonly bytes: ByteView<UCAN.UCAN<C>>
  readonly data: UCAN.View<C>

  asCID: UCANLink<C>

  export(): IterableIterator<Block>

  issuer: UCAN.Principal
  audience: UCAN.Principal
  capabilities: C
  expiration?: number
  notBefore?: number

  nonce?: string

  facts: Fact[]
  proofs: Proof[]
  iterate(): IterableIterator<Delegation>
}

/**
 * An Invocation represents a UCAN that can be presented to a service provider to
 * invoke or "exercise" a {@link Capability}. You can think of invocations as a
 * serialized function call, where the ability or `can` portion of the Capability acts
 * as the function name, and the resource (`with`) and caveats (`nb`) of the capability
 * act as function arguments.
 * 
 * Most Invocations will require valid proofs, which consist of a chain of {@link Delegation}s.
 * The service provider will inspect the proofs to verify that the invocation has
 * sufficient privileges to execute.
 */
export interface Invocation<C extends Capability = Capability>
  extends Delegation<[C]> {
    /** The `issuer` for an {@link Invocation} is the party requesting the invocation from the service provider. */
    issuer: Signer

    /** The `audience` for an {@link Invocation} is the service provider who will execute the invocation. */
    audience: Principal
  }

/**
 * A {@link UCANOptions} instance that includes options specific to {@link Invocation}s.
 */
export interface InvocationOptions<C extends Capability = Capability>
  extends UCANOptions {
  
  /** The `issuer` of an invocation is the "caller" of the RPC method and the party that signs the invocation UCAN token. */
  issuer: Signer

  /** The {@link Capability} that is being invoked. */
  capability: C
}

export interface IssuedInvocation<C extends Capability = Capability>
  extends DelegationOptions<[C]> {
  readonly issuer: Signer
  readonly audience: Principal
  readonly capabilities: [C]

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

/**
 * An invocation handler, as returned by {@link @ucanto/server#provide | `Server.provide` }.
 * 
 * @typeParam I - the {@link Capability} type accepted by the handler
 * @typeParam O - type returned by the handler on success
 * @typeParam X - type returned by the handler on error
 */
export interface ServiceMethod<
  I extends Capability,
  O,
  X extends { error: true }
> {
  (input: Invocation<I>, context: InvocationContext): Await<
    Result<O, X | InvocationError>
  >
}

/**
 * Error types returned by the framework during invocation that are not
 * specific to any particular {@link ServiceMethod}.
 */
export type InvocationError =
  | HandlerNotFound
  | HandlerExecutionError
  | InvalidAudience
  | Unauthorized

export interface InvocationContext extends CanIssue {
  id: Principal
  my?: (issuer: DID) => Capability[]
  resolve?: (proof: UCANLink) => Await<Result<Delegation, UnavailableProof>>

  principal: PrincipalParser
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
> = ResolveServiceMethod<S, C['can']> extends ServiceMethod<
  infer C,
  infer _T,
  infer _X
>
  ? IssuedInvocation<C>
  : never

export type InferServiceInvocationReturn<
  C extends Capability,
  S extends Record<string, any>
> = ResolveServiceMethod<S, C['can']> extends ServiceMethod<
  infer _,
  infer T,
  infer X
>
  ? Result<
      T,
      | X
      | HandlerNotFound
      | HandlerExecutionError
      | InvalidAudience
      | Unauthorized
    >
  : never

export type InferServiceInvocations<
  I extends unknown[],
  T extends Record<string, any>
> = I extends []
  ? []
  : I extends [ServiceInvocation<infer C, T>, ...infer Rest]
  ? [InferServiceInvocationReturn<C, T>, ...InferServiceInvocations<Rest, T>]
  : never

export interface IssuedInvocationView<C extends Capability = Capability>
  extends IssuedInvocation<C> {
  delegate(): Promise<Delegation<[C]>>
  execute<T extends InvocationService<C>>(
    service: ConnectionView<T>
  ): Await<InferServiceInvocationReturn<C, T>>
}

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
  C extends Capability,
  A extends string = C['can']
> = A extends `${infer Base}/${infer Path}`
  ? { [Key in Base]: InvocationService<C, Path> }
  : {
      [Key in A]: ServiceMethod<C, any, any>
    }

export type ExecuteInvocation<
  C extends Capability,
  T extends Record<string, any>,
  Ability extends string = C['can']
> = Ability extends `${infer Base}/${infer Path}`
  ? ExecuteInvocation<C, T[Base], Path>
  : T[Ability] extends (input: Invocation<C>) => infer Out
  ? Out
  : never

export type Result<T extends unknown, X extends { error: true }> =
  | (T extends null | undefined ? T : never)
  | (T & { error?: never })
  | X

export interface Failure extends Error {
  error: true
}

export interface HandlerNotFound extends RangeError {
  error: true
  capability: Capability
  name: 'HandlerNotFound'
}

export interface HandlerExecutionError extends Failure {
  capability: Capability
  cause: Error
  name: 'HandlerExecutionError'
}

export type API<T> = T[keyof T]

export interface OutpboundTranpsortOptions {
  readonly encoder: Transport.RequestEncoder
  readonly decoder: Transport.ResponseDecoder
}
export interface ConnectionOptions<T extends Record<string, any>>
  extends Transport.EncodeOptions,
    OutpboundTranpsortOptions {
  readonly id: Principal
  readonly channel: Transport.Channel<T>
}

export interface Connection<T extends Record<string, any>>
  extends Phantom<T>,
    ConnectionOptions<T> {
  readonly id: Principal
  readonly hasher: MultihashHasher
}

export interface ConnectionView<T extends Record<string, any>>
  extends Connection<T> {
  id: Principal
  execute<
    C extends Capability,
    I extends Transport.Tuple<ServiceInvocation<C, T>>
  >(
    ...invocations: I
  ): Await<InferServiceInvocations<I, T>>
}

export interface InboundTransportOptions {
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
}

/**
 * Options for UCAN validation.
 */
export interface ValidatorOptions {
  /**
   * Takes principal parser that can be used to turn a `UCAN.Principal`
   * into `Ucanto.Principal`.
   */
  readonly principal?: PrincipalParser

  readonly canIssue?: CanIssue['canIssue']
  readonly my?: InvocationContext['my']
  readonly resolve?: InvocationContext['resolve']
}

export interface ServerOptions
  extends InboundTransportOptions,
    ValidatorOptions {
  /**
   * Service DID which will be used to verify that received invocation
   * audience matches it.
   */
  readonly id: Principal
}

/**
 * A definition for a {@link Service}, combined with an optional
 * handler method for execution errors.
 * 
 * Used as input to {@link @ucanto/server#create | `Server.create` } when
 * defining a service implementation.
 */
export interface Server<T> extends ServerOptions {
  /**
   * Actual service providing capability handlers.
   */
  readonly service: T

  readonly catch?: (err: HandlerExecutionError) => void
}

/**
 * A materialized {@link Server} that is configured to use a specific
 * transport channel. The `ServerView` has an {@link InvocationContext}
 * which contains the DID of the service itself, among other things.
 *
 * Returned by {@link @ucanto/server#create | `Server.create` } when instantiating
 * a server.
 */
export interface ServerView<T extends Record<string, any>>
  extends Server<T>,
    Transport.Channel<T> {
  context: InvocationContext
  catch: (err: HandlerExecutionError) => void
}

/**
 * A mapping of service names to handlers, used to define a service implementation.
 * 
 * See {@link Server}, which wraps a `Service` and is used by {@link @ucanto/server/create}.
 */
export type Service = Record<
  string,
  (input: Invocation<any>) => Promise<Result<any, any>>
>

/**
 * Something that can be `await`ed to get a value of type `T`.
 */
export type Await<T> = T | PromiseLike<T> | Promise<T>

/**
 * A string literal type that matches the "scheme" portion of a URI.
 */
export type Protocol<Scheme extends string = string> = `${Scheme}:`

/**
 * A typed string representing a URI of a given protocol.
 * 
 * @typeParam P - The protocol (scheme) of the given uri. For example, `did:key:foo` has the protocol of `did`.
 */
export type URI<P extends Protocol = Protocol> = `${P}${string}` &
  // ⚠️ Without phantom type TS does not seem to retain `P` type
  // resulting in `${string}${string}` instead.
  Phantom<{
    protocol: P
  }>

/**
 * A `PrincipalParser` provides {@link Verifier} instances that can validate UCANs issued
 * by a given {@link Principal}.
 */
export interface PrincipalParser {
  parse(did: UCAN.DID): Verifier
}

/**
 * Represents component that can create a signer from it's archive. Usually
 * signer module would provide `from` function and therefor be implementation
 * of this interface.
 * Library also provides utility functions for combining multiple
 * SignerImporters into one.
 */
export interface SignerImporter<Self extends Signer = Signer> {
  from(archive: SignerArchive<Self>): Self
}

export interface Signer<M extends string = string, A extends number = number>
  extends UCANSigner<M, A> {
  /**
   * Returns archive of this signer which is byte encoded form when signer key
   * is extractable and is {@link SignerInfo} form otherwise. This allows a user
   * to store non extractable archives in indexedDB and store extractable
   * archives on disk, which matches general expectation that in browsers
   * unextratable keys should be used and extractable keys in node.
   *
   * @example
   * ```ts
   * const save = async (signer: Signer) => {
   *   const archive = signer.toArchive()
   *   if (archive instanceof Uint8Array) {
   *     await fs.writeFile(KEY_PATH, archive)
   *   } else {
   *     await IDB_OBJECT_STORE.add(archive)
   *   }
   * }
   * ```
   */
  toArchive(): SignerArchive<Signer<M, A>>
}

export interface SignerInfo<Self extends Signer = Signer> {
  readonly did: ReturnType<Self['did']>
  readonly key: CryptoKey
}

export type SignerArchive<Self extends Signer = Signer> =
  | ByteView<Self>
  | SignerInfo<Self>

export { Verifier }

export type InferInvokedCapability<
  C extends CapabilityParser<Match<ParsedCapability>>
> = C extends CapabilityParser<Match<infer T>> ? T : never

export type Intersection<T> = (T extends any ? (i: T) => void : never) extends (
  i: infer I
) => void
  ? I
  : never

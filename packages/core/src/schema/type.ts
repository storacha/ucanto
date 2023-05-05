import {
  Failure as Error,
  Await,
  Result,
  Variant,
  Phantom,
  Link,
  BlockStore,
  Block,
  BlockCodec,
  BlockDecoder,
  BlockEncoder,
  MultihashHasher,
  MulticodecCode,
  MultibaseDecoder,
  MultibaseEncoder,
  UnknownLink,
  IPLDView,
  IPLDViewBuilder,
  BuildOptions,
  ByteView,
} from '@ucanto/interface'

export type {
  Link,
  UnknownLink,
  BlockStore,
  Block,
  BlockCodec,
  BlockEncoder,
  BlockDecoder,
  MultihashHasher,
  MulticodecCode,
  MultibaseDecoder,
  MultibaseEncoder,
  ByteView,
  IPLDView,
  IPLDViewBuilder,
  BuildOptions,
  Phantom,
}

export interface Reader<O = unknown, I = unknown, X extends Error = Error> {
  read: (input: I) => Result<O, X>
}

export interface Writer<O = unknown, I = unknown, X extends Error = Error> {
  write: (output: O) => Result<I, X>
}

export type { Error, Result }

export type ReadResult<T, X extends Error = Error> = Result<T, X>

export interface Convert<O = unknown, I = unknown, X extends Error = Error>
  extends Reader<O, I, X>,
    Writer<O, I, X> {}

export interface Schema<
  Out extends unknown = unknown,
  In extends unknown = unknown
> extends Convert<Out, In> {
  optional(): Schema<Out | undefined, In | undefined>
  nullable(): Schema<Out | null, In | null>

  implicit(value: Exclude<Out, undefined>): ImplicitSchema<Out, In>

  array(): ArraySchema<Out, In>
  or<O, I>(other: Convert<O, I>): Schema<Out | O, In | I>
  and<O, I>(other: Convert<O, I>): Schema<Out & O, In & I>
  refine<O extends Out, I extends Out>(schema: Convert<O, I>): Schema<O, In>

  // lift: <O extends Out, X extends Out>(from: Convert<O, X>) => Schema<O, In>

  // into<I>(schema: Convert<In, I>): Schema<Out, I>
  pipe<O>(schema: Convert<O, Out>): Schema<O, In>

  brand<K extends string>(kind?: K): Schema<Branded<Out, K>, In>

  is(value: unknown): value is Out
  from(value: In): Out
  to(value: Out): In

  // conforms(value: unknown): value is Out

  link<
    Code extends MulticodecCode,
    Alg extends MulticodecCode,
    V extends UnknownLink['version']
  >(options?: {
    codec?: BlockCodec<Code, unknown>
    version?: V
    hasher?: MultihashHasher<Alg>
  }): LinkSchema<Out, Link<Out, Code, Alg, V> | IPLDView<Out>, Code, Alg, V>

  // attachment<
  //   Code extends MulticodecCode,
  //   Alg extends MulticodecCode,
  //   V extends UnknownLink['version']
  // >(options?: {
  //   codec?: BlockCodec<Code, unknown>
  //   version?: V
  //   hasher?: MultihashHasher<Alg>
  // }): AttachmentSchema<O, Code, Alg, V>

  // codec: BlockCodec<number, unknown>
  // hasher: MultihashHasher<number>

  // toIPLDBuilder(input: I): Result<IPLDViewBuilder<IPLDView<O>>, Error>

  // toIPLDView(source: {
  //   link: Link
  //   store: BlockStore
  // }): ReturnType<this['createIPLDView']>

  // createIPLDView(source: IPLDViewSource): Result<IPLDView<O>, Error>

  // view(value: O): View<O>
  // attach(value: O): Await<Attachment<O>>

  // compile(value: I): Await<CompiledView<ToBlock<O>>>
  // attachment(value: I): Await<IPLDView<O>>

  // IN: I
  // OUT: Out
}

export interface PropertySchema {}

export interface ByteSchemaSettings<
  Model,
  Out extends Model,
  Code extends MulticodecCode
> {
  codec: BlockCodec<Code, Model>
  convert: Convert<Out, Model>
}

export interface BytesSchema<
  Out = Uint8Array,
  Code extends MulticodecCode = MulticodecCode<0x55, 'raw'>
> extends Schema<Out, Uint8Array> {
  code: Code
  name: string
  encode(value: Out): ByteView<Out>
  decode(value: ByteView<Out>): Out

  refine<O extends Out, I extends Out>(
    schema: Convert<O, I>
  ): BytesSchema<O, Code>
}

export type ToBlock<T> = {
  [K in keyof T]: T[K] extends ResolvedLink<
    infer O,
    infer Code,
    infer Alg,
    infer V
  >
    ? Linked<O, Code, Alg, V>
    : T[K]
}

export interface Linked<
  T extends unknown = unknown,
  Code extends MulticodecCode = MulticodecCode,
  Alg extends MulticodecCode = MulticodecCode,
  V extends UnknownLink['version'] = 1
> extends Link<T, Code, Alg, V> {
  resolve(store?: BlockStore): ResolvedLink<T, Code, Alg, V>
}

export interface CompiledView<O> extends IPLDView<O> {
  root: Required<Block<O>>
}

export type ResolvedLink<
  T extends unknown = unknown,
  Code extends MulticodecCode = MulticodecCode,
  Alg extends MulticodecCode = MulticodecCode,
  V extends UnknownLink['version'] = 1
> = T & Phantom<Link<T, Code, Alg, V>>

// export interface View<O> {
//   valueOf(): O
//   attach(): Await<Attachment<O>>
// }

// export interface AttachmentSchema<
//   T extends unknown = unknown,
//   Code extends MulticodecCode = MulticodecCode,
//   Alg extends MulticodecCode = MulticodecCode,
//   V extends UnknownLink['version'] = 1
// > extends Schema<Attachment<T, Code, Alg, V>> {
//   attach(source: T): Await<Attachment<T, Code, Alg, V>>
// }

// export interface Attachment<
//   T extends unknown = unknown,
//   Code extends MulticodecCode = MulticodecCode,
//   Alg extends MulticodecCode = MulticodecCode,
//   V extends UnknownLink['version'] = 1
// > extends IPLDView<T> {
//   load(): T
//   link(): Link<T, Code, Alg, V>
// }

export interface LinkSchema<
  Out extends unknown,
  In extends unknown,
  Code extends MulticodecCode,
  Alg extends MulticodecCode,
  V extends UnknownLink['version']
> extends Schema<Linked<Out, Code, Alg, V>, In> {
  link(): never

  // attach(): AttachmentSchema<O, IPLDView<O>, Code, Alg, V>
  // resolve(): Schema<ResolvedLink<O, Code, Alg, V>, O | IPLDView<O>>
  parse<Prefix extends string>(
    source: string,
    base?: MultibaseDecoder<Prefix>
  ): Linked<Out, Code, Alg, V>
}

export interface AttachmentSchema<
  O extends unknown,
  I extends unknown,
  Code extends MulticodecCode,
  Alg extends MulticodecCode,
  V extends UnknownLink['version']
> extends Schema<Linked<O, Code, Alg, V>, I> {}

export interface IPLDViewSource {
  root: Block
  store: BlockStore
}

export interface CreateView<T, V> {
  create(source: {
    root: Required<Block>
    store: BlockStore
    schema: Schema<T>
  }): IPLDView<T> & V
}

export interface ImplicitSchema<O, I>
  extends Omit<Schema<Exclude<O, undefined>, I | undefined>, 'optional'> {
  readonly value: Exclude<O, undefined>
  optional(): ImplicitSchema<O, I>
}

export type NotUndefined<T extends unknown = unknown> = Exclude<T, undefined>

export interface ArraySchema<O, I> extends Schema<O[], I[]> {
  element: Convert<O, I>
}

/**
 * In IPLD Schema types may have different [representation]s, this interface
 * represents all the types that have a map representation and defines
 * extensions relevant to such types.
 * [representation]: https://ipld.io/docs/schemas/features/representation-strategies/
 */
export interface MapRepresentation<
  V extends Record<string, unknown>,
  U extends Record<string, unknown>
> extends Schema<V, U> {
  /**
   * Returns equivalent schema in which all of the fields are optional.
   */
  partial(): MapRepresentation<Partial<V>, Partial<U>>
}

export interface DictionarySchema<V, K extends string, U>
  extends Omit<
    MapRepresentation<Dictionary<K, V>, Dictionary<K, U>>,
    'partial'
  > {
  key: Reader<K, string>
  value: Convert<V, U>

  partial(): DictionarySchema<V | undefined, K, U | undefined>
}

export type Dictionary<
  K extends string = string,
  V extends unknown = unknown
> = {
  [Key in K]: V
}

export interface LiteralSchema<
  Out extends string | number | boolean | null,
  In extends string | number | boolean | null = Out
> extends Schema<Out, In> {
  implicit(value?: Out): ImplicitSchema<Out, In>
  readonly value: Out
}

export interface NumberSchema<
  Out extends number = number,
  In extends number = number
> extends Schema<Out, In> {
  isInteger: typeof Number.isInteger
  isFinite: typeof Number.isFinite
  greaterThan(n: number): NumberSchema<Out, In>
  lessThan(n: number): NumberSchema<Out, In>

  optional(): Schema<Out | undefined, In | undefined>

  refine<O extends Out, I extends Out>(
    convert: Convert<O, I>
  ): NumberSchema<O, In>
  constraint(check: (value: Out) => ReadResult<Out>): NumberSchema<Out, In>
}

export interface StructMembers {
  [key: string]: Convert
}

export interface StructSchema<Members extends StructMembers = {}>
  extends MapRepresentation<InferStruct<Members>, InferStructInput<Members>> {
  shape: Members

  create(
    input: MarkEmptyOptional<InferStructSource<Members>>
  ): InferStruct<Members>
  extend<E extends StructMembers>(extension: E): StructSchema<Members & E>

  partial(): MapRepresentation<
    Partial<InferStruct<Members>>,
    Partial<InferStructInput<Members>>
  > &
    StructSchema

  // createIPLDView(
  //   source: IPLDViewSource
  // ): Result<IPLDView<InferStruct<Members>> & InferStruct<Members>, Error>

  // view(value: InferStruct<U>): InferStruct<U> & IPLDView<InferStruct<U>>
}

/**
 * Schema for the {@link Variant} types, which is a special kind of union type
 * where every choice is a struct with a single field denoting the choice.
 *
 * The `_` branch is a special case which can be used to represent all other
 * choices that are not explicitly defined. Unlike other branches, the `_`
 * schema is passed the entire input instead of just the value of the field.
 *
 * @template Choices - Mapping of branch names to corresponding schemas.
 * @template In - Input type for which schema can be read.
 *
 * @example
 * ```ts
 * const Shape = Variant({
 *    circle: Schema.struct({ radius: Schema.integer() }),
 *    rectangle: Schema.struct({ width: Schema.integer(), height: Schema.integer() })
 * })
 * ```
 */
export interface VariantSchema<Choices extends VariantChoices = {}>
  extends Schema<InferVariant<Choices>, InferVariantInput<Choices>> {
  /**
   * Function can be used to match the input against the variant schema to
   * return the matched branch name and corresponding value. It provides
   * convenience over standard `.read` / `.from` methods by allowing user
   * to switch over the branch name as opposed to having to do nested `if else`
   * blocks.
   *
   * @example
   * ```ts
   * const [kind, shape] = Shape.match(input)
   * switch (kind) {
   *   case "circle": return `Circle with radius ${shape.radius}`
   *   case "rectangle": return `Rectangle with width ${shape.width} and height ${shape.height}`
   * }
   * ```
   *
   * @param input - Input to match against the variant schema.
   * @param fallback - Fall back value to return if the input does not match
   * any of the branches. If not provided, the function will throw an error
   * if the input does not match any of the branches.
   */
  match<Else = never>(
    input: unknown,
    fallback?: Else
  ): InferVariantMatch<Choices> | (Else extends never ? never : [null, Else])

  /**
   * Convenience function to create a new variant value. Unlike the `.from` it
   * has input typed so that type checker can help you to ensure that you are
   * providing all the required fields. If invalid input is provided, the
   * function will throw an error.
   */
  create<Choice extends InferVariant<Choices>>(input: Choice): Choice
}

/**
 * Type describing the choices for the variant. It is a map of branch names to
 * their respective schemas.
 */
export interface VariantChoices {
  [branch: string]: Convert
}

/**
 * Utility type for inferring the {@link Variant} from {@link VariantChoices}.
 */
export type InferVariant<Choices extends VariantChoices> = {
  [Case in keyof Choices]: {
    [Key in Exclude<keyof Choices, Case>]?: never
  } & {
    [Key in Case]: Choices[Case] extends Reader<infer T> ? T : never
  }
}[keyof Choices]

export type InferVariantInput<Choices extends VariantChoices> = {
  [Case in keyof Choices]: {
    [Key in Exclude<keyof Choices, Case>]?: never
  } & {
    [Key in Case]: Choices[Case] extends Writer<any, infer T> ? T : never
  }
}[keyof Choices]

/**
 * Utility type for inferring the result of calling `match` on the {@link VariantSchema}.
 * It derives a tuple of the branch name and the value of the branch allowing
 * use of `switch` statement for type narrowing.
 */
export type InferVariantMatch<Choices extends VariantChoices> = {
  [Branch in keyof Choices]: Choices[Branch] extends Reader<infer Value>
    ? [Branch, Value]
    : never
}[keyof Choices]

export type InferOptionalStructShape<U extends { [key: string]: Reader }> = {
  [K in keyof U]: InferOptionalReader<U[K]>
}

export type InferOptionalReader<R extends Reader> = R extends Reader<infer T>
  ? Reader<T | undefined>
  : R

export interface StringSchema<Out extends string, In extends string = string>
  extends Schema<Out, In> {
  refine<I extends Out, O extends Out>(
    convert: Reader<O, I>
  ): StringSchema<O, In>
  constraint(check: (value: Out) => ReadResult<Out>): StringSchema<Out, In>
  startsWith<Prefix extends string>(
    prefix: Prefix
  ): StringSchema<Out & `${Prefix}${string}`, In>
  endsWith<Suffix extends string>(
    suffix: Suffix
  ): StringSchema<Out & `${string}${Suffix}`, In>
}

declare const Marker: unique symbol
export type Branded<T, Brand> = T & {
  [Marker]: T
}

export type Integer = number & Phantom<{ typeof: 'integer' }>
export type Float = number & Phantom<{ typeof: 'float' }>

export type Infer<T extends Reader> = T extends Reader<infer T, any> ? T : never
export type InferInput<T extends Writer> = T extends Writer<any, infer T>
  ? T
  : never

export type InferIntersection<U extends [Reader, ...Reader[]]> = {
  [K in keyof U]: (input: Infer<U[K]>) => void
}[number] extends (input: infer T) => void
  ? T
  : never

export type InferIntersectionInput<U extends [Writer, ...Writer[]]> = {
  [K in keyof U]: (input: InferInput<U[K]>) => void
}[number] extends (input: infer T) => void
  ? T
  : never

export type InferUnion<U extends [Reader, ...Reader[]]> = Infer<U[number]>
export type InferUnionInput<U extends [Writer, ...Writer[]]> = InferInput<
  U[number]
>

export type InferTuple<U extends [Reader, ...Reader[]]> = {
  [K in keyof U]: Infer<U[K]>
}

export type InferTupleInput<U extends [Writer, ...Writer[]]> = {
  [K in keyof U]: InferInput<U[K]>
}

export type InferStruct<Shape extends StructMembers> = MarkOptionals<{
  [K in keyof Shape]: Infer<Shape[K]>
}>

export type InferStructInput<Shape extends StructMembers> = MarkOptionals<{
  [K in keyof Shape]: InferInput<Shape[K]>
}>

export type InferStructSource<U extends { [key: string]: Reader }> =
  // MarkEmptyOptional<
  MarkOptionals<{
    [K in keyof U]: InferSource<U[K]>
  }>
// >

export type InferSource<U extends Reader> = U extends ImplicitSchema<
  infer T,
  any
>
  ? T | undefined
  : U extends StructSchema
  ? InferStructSource<U['shape']>
  : U extends Reader<infer T>
  ? T
  : never

export type MarkEmptyOptional<T extends object> = RequiredKeys<T> extends never
  ? T | void
  : T

type MarkOptionals<T extends object> = Pick<T, RequiredKeys<T>> &
  Partial<Pick<T, OptionalKeys<T>>>

type RequiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k
}[keyof T] & {}

type OptionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never
}[keyof T] & {}

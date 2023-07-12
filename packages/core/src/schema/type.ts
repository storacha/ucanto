import { Failure as Error, Result, Variant, Phantom } from '@ucanto/interface'

export interface Reader<O = unknown, I = unknown, X extends Error = Error> {
  read(input: I): Result<O, X>
}

export type { Error, Result }

export type ReadResult<T, X extends Error = Error> = Result<T, X>

export interface Schema<
  O extends unknown = unknown,
  I extends unknown = unknown
> extends Reader<O, I> {
  optional(): Schema<O | undefined, I>
  nullable(): Schema<O | null, I>
  array(): Schema<O[], I>
  default(value: NotUndefined<O>): DefaultSchema<NotUndefined<O>, I>
  or<T>(other: Reader<T, I>): Schema<O | T, I>
  and<T>(other: Reader<T, I>): Schema<O & T, I>
  refine<T extends O>(schema: Reader<O & T, O>): Schema<T, I>

  brand<K extends string>(kind?: K): Schema<Branded<O, K>, I>

  is(value: unknown): value is O
  from(value: I): O
}

export interface DefaultSchema<
  O extends unknown = unknown,
  I extends unknown = unknown
> extends Schema<O, I> {
  readonly value: O & NotUndefined<O>
  optional(): DefaultSchema<O & NotUndefined<O>, I>
}

export type NotUndefined<T extends unknown = unknown> = Exclude<T, undefined>

export interface ArraySchema<T, I = unknown> extends Schema<T[], I> {
  element: Reader<T, I>
}

/**
 * In IPLD Schema types may have different [representation]s, this interface
 * represents all the types that have a map representation and defines
 * extensions relevant to such types.
 * [representation]: https://ipld.io/docs/schemas/features/representation-strategies/
 */
export interface MapRepresentation<
  V extends Record<string, unknown>,
  I = unknown
> extends Schema<V, I> {
  /**
   * Returns equivalent schema in which all of the fields are optional.
   */
  partial(): MapRepresentation<Partial<V>, I>
}

export interface DictionarySchema<V, K extends string, I = unknown>
  extends MapRepresentation<Dictionary<K, V>, I> {
  key: Reader<K, string>
  value: Reader<V, I>

  partial(): DictionarySchema<V | undefined, K, I>
}

export type Dictionary<
  K extends string = string,
  V extends unknown = unknown
> = {
  [Key in K]: V
}

export interface LiteralSchema<
  T extends string | number | boolean | null,
  I = unknown
> extends Schema<T> {
  default(value?: T): DefaultSchema<T & NotUndefined<T>, I>
  readonly value: T
}

export interface NumberSchema<
  N extends number = number,
  I extends unknown = unknown
> extends Schema<N, I> {
  greaterThan(n: number): NumberSchema<N, I>
  lessThan(n: number): NumberSchema<N, I>

  refine<T extends N>(schema: Reader<T, N>): NumberSchema<T & N, I>
}

export interface StructSchema<
  U extends { [key: string]: Reader } = {},
  I extends unknown = unknown
> extends MapRepresentation<InferStruct<U>, I> {
  shape: U

  create(input: MarkEmptyOptional<InferStructSource<U>>): InferStruct<U>
  extend<E extends { [key: string]: Reader }>(
    extension: E
  ): StructSchema<U & E, I>

  partial(): MapRepresentation<Partial<InferStruct<U>>, I> & StructSchema
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
export interface VariantSchema<
  Choices extends VariantChoices = {},
  In extends unknown = unknown
> extends Schema<InferVariant<Choices>, In> {
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
  [branch: string]: Reader
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

export interface StringSchema<O extends string, I = unknown>
  extends Schema<O, I> {
  startsWith<Prefix extends string>(
    prefix: Prefix
  ): StringSchema<O & `${Prefix}${string}`, I>
  endsWith<Suffix extends string>(
    suffix: Suffix
  ): StringSchema<O & `${string}${Suffix}`, I>
  refine<T>(schema: Reader<T, O>): StringSchema<O & T, I>
}

declare const Marker: unique symbol
export type Branded<T, Brand> = T & {
  [Marker]: T
}

export type Integer = number & Phantom<{ typeof: 'integer' }>
export type Float = number & Phantom<{ typeof: 'float' }>
export type Uint64 = bigint & Phantom<{ typeof: 'uint64' }>

export type Infer<T extends Reader> = T extends Reader<infer T, any> ? T : never

export type InferIntersection<U extends [Reader, ...Reader[]]> = {
  [K in keyof U]: (input: Infer<U[K]>) => void
}[number] extends (input: infer T) => void
  ? T
  : never

export type InferUnion<U extends [Reader, ...Reader[]]> = Infer<U[number]>

export type InferTuple<U extends [Reader, ...Reader[]]> = {
  [K in keyof U]: Infer<U[K]>
}

export type InferStruct<U extends { [key: string]: Reader }> = MarkOptionals<{
  [K in keyof U]: Infer<U[K]>
}>

export type InferStructSource<U extends { [key: string]: Reader }> =
  // MarkEmptyOptional<
  MarkOptionals<{
    [K in keyof U]: InferSource<U[K]>
  }>
// >

export type InferSource<U extends Reader> = U extends DefaultSchema<infer T>
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

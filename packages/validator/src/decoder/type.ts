import { Failure as Error, Result, Phantom } from '@ucanto/interface'

export interface Reader<
  O = unknown,
  I = unknown,
  X extends { error: true } = Error
> {
  read(input: I): Result<O, X>
}

export type { Error }

export type ReadResult<T, X extends { error: true } = Error> = Result<T, X>

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
> extends Schema<InferStruct<U>, I> {
  shape: U

  create(input: MarkEmptyOptional<InferStructSource<U>>): InferStruct<U>
  extend<E extends { [key: string]: Reader }>(
    extension: E
  ): StructSchema<U & E, I>
}

export interface StringSchema<O extends string, I = unknown>
  extends Schema<O, I> {
  startsWith<Prefix extends string>(
    prefix: Prefix
  ): StringSchema<O & `${Prefix}${string}`, I>
  endsWith<Suffix extends string>(
    suffix: Suffix
  ): StringSchema<O & `${string}${Suffix}`, I>
  refine<T>(schema: Reader<O & T, O>): StringSchema<O & T, I>
}

declare const Marker: unique symbol
export type Branded<T, Brand> = T & {
  [Marker]: T
}

export type Integer = number & Phantom<{ typeof: 'integer' }>
export type Float = number & Phantom<{ typeof: 'float' }>

export type Infer<T extends Reader> = T extends Reader<infer T, any> ? T : never

export type InferIntesection<U extends [Reader, ...Reader[]]> = {
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

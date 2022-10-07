import { Failure as Error, Result, Phantom } from '@ucanto/interface'

export interface Reader<
  O = unknown,
  I = unknown,
  X extends { error: true } = Error
> {
  read(input: I): ReadResult<O, X>
}

export type { Error }

export type ReadResult<T, X extends { error: true } = Error> = Result<T, X>

export interface Schema<O, I = unknown> extends Reader<O, I> {
  optional(): Schema<O | undefined, I>
  nullable(): Schema<O | null, I>
  array(): Schema<O[], I>
  default(value: O): Schema<O, I>
  or<T>(other: Reader<T, I>): Schema<O | T, I>
  and<T>(other: Reader<T, I>): Schema<O & T, I>
  refine<T extends O>(schema: Reader<O & T, O>): Schema<T, I>

  brand<K extends string>(kind?: K): Schema<Branded<O, K>, I>

  is(value: unknown): value is O
  from(value: I): O
}

export interface ArraySchema<T, I = unknown> extends Schema<T[], I> {
  element: Reader<T, I>
}

export interface LiteralSchema<
  T extends string | number | boolean | null,
  I = unknown
> extends Schema<T> {
  default(value?: T): Schema<T, I>
  readonly value: T
}

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

export type Branded<T, Brand> = T & Phantom<{ brand: Brand }>

export type Integer = Branded<number, 'Integer'>
export type Float = Branded<number, 'float'>

export type Infer<T extends Reader<unknown, any>> = T extends Reader<
  infer T,
  any
>
  ? T
  : never

export type InferIntesection<
  U extends [Reader<unknown, any>, ...Reader<unknown, any>[]]
> = { [K in keyof U]: (input: Infer<U[K]>) => void }[number] extends (
  input: infer T
) => void
  ? T
  : never

export type InferUnion<
  U extends [Reader<unknown, any>, ...Reader<unknown, any>[]]
> = Infer<U[number]>

export type InferTuple<
  U extends [Reader<unknown, any>, ...Reader<unknown, any>[]]
> = { [K in keyof U]: Infer<U[K]> }

export type InferStruct<U extends { [key: string]: Reader }> = {
  [K in keyof U]: Infer<U[K]>
}

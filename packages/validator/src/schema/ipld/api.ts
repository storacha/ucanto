import { Phantom, Link, API } from '@ucanto/interface'
import { Infer, Integer, nullable, unknown } from '../schema.js'
import * as IPLD from './ipld.js'
import { The } from './schema.js'

export type { Phantom, IPLD }

export interface Schema<
  View = unknown,
  Model = View,
  Type extends IPLD.Type = IPLD.Type
> {
  conform(view: unknown): Result<View, ConformanceError>

  encode(view: View): Result<Model, ConformanceError>
  decode(model: Model): Result<View, ConformanceError>

  toJSON(): Type
}

export type TypeFromJSON<T extends IPLD.Type> = T extends {
  bool: IPLD.BooleanType
}
  ? boolean
  : T extends { string: IPLD.StringType }
  ? string
  : T extends { bytes: IPLD.BytesType }
  ? Uint8Array
  : T extends { int: IPLD.IntType }
  ? integer
  : T extends { float: IPLD.FloatType }
  ? float
  : T extends { unit: IPLD.UnitType }
  ? T['unit']
  : T extends { any: IPLD.AnyType }
  ? unknown
  : T extends { link: IPLD.LinkType }
  ? Link<TypeFromJSON<T['link']['expectedType']>>
  : T extends { map: IPLD.MapType }
  ? MapTypeFromJSON<T['map']>
  : T extends { list: IPLD.ListType }
  ? ListTypeFromJSON<T['list']>
  : T extends { union: IPLD.UnitType }
  ? UnionTypeFromJSON<T['union']>
  : T extends { enum: IPLD.EnumType }
  ? EnumFromJSON<T['enum']>
  : T extends { struct: IPLD.StructType }
  ? StructTypeFromJSON<T['struct']>
  : never

export type ToIPLDSchema<T extends Schema> = ReturnType<T['toJSON']>

export type StructTypeFromJSON<T extends IPLD.StructType> =
  T['representation'] extends { map: IPLD.StructAsMap }
    ? MapStruct<T['fields'], Or<T['representation']['map']['fields'], {}>>
    : T['representation'] extends { tuple: IPLD.StructAsTuple }
    ? TupleStruct<T['fields'], T['representation']['tuple']['fieldOrder']>
    : T['representation'] extends { stringpairs: IPLD.StructAsStringPairs }
    ? StringStruct<
        T['fields'],
        T['representation']['stringpairs']['innerDelim'],
        T['representation']['stringpairs']['entryDelim']
      >
    : T['representation'] extends { stringjoin: IPLD.StructAsStringJoin }
    ? StringJoinStruct<
        T['fields'],
        T['representation']['stringjoin']['join'],
        T['representation']['stringjoin']['fieldOrder']
      >
    : T['representation'] extends { listpairs: IPLD.StructAsListPairs }
    ? StructPairList<T['fields']>
    : never

type StringStruct<
  T extends IPLD.StructFields,
  D extends string,
  S extends string,
  Keys = keyof T
> = Keys extends [infer K]
  ? `${K & string}${D}${TypeFromJSON<T[K & keyof T]['type']> & string}`
  : Keys extends [infer K, ...infer KS]
  ? `${K & string}${D}${TypeFromJSON<T[K & keyof T]['type']> &
      string}${S}${StringStruct<T, D, S, KS>}`
  : ''

type StringJoinStruct<
  T extends IPLD.StructFields,
  J extends string,
  O extends IPLD.StructFieldOrder | undefined,
  F = O extends undefined ? UnionToTuple<keyof T & string> : O
> = F extends [infer K]
  ? TypeFromJSON<T[K & keyof T]['type']> & string
  : F extends [infer K, ...infer KS]
  ? `${TypeFromJSON<T[K & keyof T]['type']> & string}${J}${StringJoinStruct<
      T,
      J,
      O,
      KS
    >}`
  : ''

type StructPairList<T extends IPLD.StructFields> = {
  [K in keyof T]: [K, T[K]]
}[keyof T]

type TupleStruct<
  T extends IPLD.StructFields,
  R extends IPLD.StructFieldOrder | undefined
> = StructTuple<T, R extends undefined ? UnionToTuple<keyof T & string> : R>

type StructTuple<T extends {}, K = UnionToTuple<keyof T & string>> = K extends [
  infer Name,
  ...infer Rest
]
  ? [[Name, T[Name & keyof T]], ...StructTuple<T, Rest>]
  : K extends []
  ? []
  : never

/**
 * Takes union and turns it into a tuple.
 * @see https://github.com/microsoft/TypeScript/issues/13298#issuecomment-692864087
 */
type UnionToTuple<U extends string, R extends any[] = []> = {
  [S in U]: Exclude<U, S> extends never
    ? [S, ...R]
    : UnionToTuple<Exclude<U, S>, [S, ...R]>
}[U]

type MapStruct<
  T extends IPLD.StructFields,
  R extends IPLD.StructAsMapFields
> = {
  [K in keyof T as FieldName<K, R>]: FieldValue<T, K, R>
}

type FieldName<K, R extends IPLD.StructAsMapFields> = K extends keyof R
  ? Or<R[K]['rename'], K>
  : K

type FieldValue<
  T extends IPLD.StructFields,
  K extends keyof T,
  R extends IPLD.StructAsMapFields
> =
  | TypeFromJSON<T[K]['type']>
  | FieldNullable<T[K]>
  | FieldOptional<T[K], Get<K, R, {}>>

type FieldNullable<T extends IPLD.StructField> = T['nullable'] extends true
  ? null
  : never

/**
 * If field is optional and has no implicit value return `undefined`, if it has
 * implicit return implicit type, otherwise return `never`
 */
type FieldOptional<
  T extends IPLD.StructField,
  R extends IPLD.StructAsMapFieldDetails
> = T['optional'] extends true
  ? R['implicit'] extends undefined
    ? undefined
    : R['implicit']
  : never

type Or<T, U> = T extends undefined ? U : T

type Get<K, T extends { [key: string]: V } | undefined, V> = K extends keyof T
  ? T[K]
  : V

export type UnionTypeFromJSON<T extends IPLD.UnionType> =
  T['representation'] extends {
    kinded: IPLD.KindedUnionRepresentation
  }
    ? KindedUnion<T['representation']['kinded']>
    : T['representation'] extends { keyed: IPLD.KeyedUnionRepresentation }
    ? KeyedUnion<T['representation']['keyed']>
    : T['representation'] extends { envelope: IPLD.EnvelopeUnionRepresentation }
    ? EnvelopeUnion<
        T['representation']['envelope']['discriminantKey'],
        T['representation']['envelope']['contentKey'],
        T['representation']['envelope']['discriminantTable']
      >
    : T['representation'] extends { inline: IPLD.InlineUnionRepresentation }
    ? InlineUnion<T['representation']['inline']['discriminantTable']>
    : T['representation'] extends {
        stringprefix: IPLD.StringPrefixUnionRepresentation
      }
    ? StringPrefixUnion<T['representation']['stringprefix']['prefixes']>
    : T['representation'] extends {
        bytesprefix: IPLD.BytesPrefixUnionRepresentation
      }
    ? BytesPrefixUnion<T['representation']['bytesprefix']['prefixes']>
    : never

export type KindedUnion<T extends IPLD.KindedUnionRepresentation> = {
  [K in keyof T]: TypeFromJSON<T[K]>
}[keyof T]

export type KeyedUnion<T extends IPLD.KeyedUnionRepresentation> = {
  [K in keyof T]: { [Tag in keyof K]: T[K] }
}[keyof T]

export type EnvelopeUnion<
  TagKey extends string,
  DataKey extends string,
  T extends { [Key: string]: IPLD.UnionMember }
> = {
  [Tag in keyof T]: { [K in TagKey]: Tag } & {
    [K in DataKey]: TypeFromJSON<T[Tag]>
  }
}[keyof T]

export type InlineUnion<T extends { [Key: string]: IPLD.UnionMember }> = {
  [Tag in keyof T]: TypeFromJSON<T[Tag]>
}[keyof T]

export type StringPrefixUnion<
  T extends { [Key: string]: { string: IPLD.StringType } }
> = {
  [Prefix in keyof T & string]: `${Prefix}${TypeFromJSON<T[Prefix]> & string}`
}[keyof T & string]

export type BytesPrefixUnion<
  T extends { [Prefix: IPLD.HexString]: IPLD.Type }
> = {
  [Prefix in keyof T]: TypeFromJSON<T[Prefix]> & Phantom<{ prefix: Prefix }>
}[keyof T]

export type ListTypeFromJSON<
  T extends IPLD.ListType,
  _R extends IPLD.ListRepresentation | undefined = T['representation']
> = Array<
  T['valueNullable'] extends true ? null | T['valueType'] : T['valueType']
>

type EnumFromJSON<T extends IPLD.EnumType> = T['representation'] extends {
  string: IPLD.EnumAsString
}
  ? StringEnum<T['representation']['string'], T['members']>
  : T['representation'] extends { int: IPLD.EnumAsInt }
  ? IntEnum<T['representation']['int']>
  : never

type StringEnum<
  T extends IPLD.EnumAsString,
  M extends [...IPLD.EnumMember[]]
> = M extends [infer K, ...infer Members]
  ? StringEnumMember<T, K> | StringEnum<T, Members & IPLD.EnumMember[]>
  : M extends [infer K]
  ? StringEnumMember<T, K>
  : never

type StringEnumMember<T extends IPLD.EnumAsString, K> = K extends keyof T
  ? T[K]
  : K

type IntEnum<T extends IPLD.EnumAsInt> = {
  [K in keyof T]: T[K]
}[keyof T]

type MapTypeFromJSON<
  T extends IPLD.MapType,
  R extends IPLD.MapRepresentation | undefined = T['representation']
> = R extends { stringpairs: IPLD.MapAsStringPairs }
  ? StringPairs<
      MapKeyType<T>,
      MapValueType<T>,
      R['stringpairs']['innerDelim'],
      R['stringpairs']['entryDelim']
    >
  : R extends { listpairs: IPLD.MapAsListPairs }
  ? Array<
      [
        TypeFromJSON<MapKeyType<T>> & string,
        TypeFromJSON<MapValueType<T>> | MapValueNullable<T>
      ]
    >
  : Record<
      TypeFromJSON<MapKeyType<T>> & string,
      TypeFromJSON<MapValueType<T>> | MapValueNullable<T>
    >

type MapKeyType<T extends IPLD.MapType> = T['keyType'] extends {}
  ? T['keyType']
  : { string: IPLD.StringType }

type MapValueType<T extends IPLD.MapType> = T['valueType'] extends {}
  ? T['valueType']
  : { any: IPLD.AnyType }

type MapValueNullable<T extends IPLD.MapType> = T['valueNullable'] extends true
  ? null
  : never

type StringPairs<
  K extends IPLD.Type,
  V extends IPLD.Type,
  I extends string,
  E extends string
> =
  | ''
  | `${TypeFromJSON<K> & string}${I}${TypeFromJSON<V> & string}`
  | `${TypeFromJSON<K> & string}${I}${TypeFromJSON<V> & string}${E}${string}`

export type integer = number & Phantom<{ int: IPLD.IntType }>
export type float = number & Phantom<{ float: IPLD.FloatType }>

export interface ConformanceError extends Error {
  schema: Schema
}
/**
 * Creates keyed union where each type is a record with a single
 * field in which key is a tag and value is type.
 *
 * ```ts
 * type Result<T, X> = Variant<{
 *    ok: T
 *    error: X
 * }>
 * ```
 */
export type Variant<
  U extends { [Key: string]: unknown } = { [Key: string]: unknown }
> = {
  [Key in keyof U]: { [K in Exclude<keyof U, Key>]?: never } & {
    [K in Key]: U[Key]
  }
}[keyof U]

/**
 * Maps variant (kinded union) type into a product (struct) type containing
 * all of the branches.
 */
export type VariantToProduct<V> = V extends Variant
  ? Required<{
      [K in keyof V]-?: V[K]
    }>
  : never

export type Result<T, X = Error> = Variant<{
  ok: T
  error: X
}>

export type Branch<V> = {
  [Branch in keyof VariantToProduct<V>]: [Branch, VariantToProduct<V>[Branch]]
}[keyof V]

import * as Schema from './type.js'
import { ok, Failure } from '../result.js'
import {
  create as createLink,
  parse as parseLink,
  createLegacy,
  isLink,
  parse,
  base32,
} from '../link.js'
export * from './type.js'
import * as sha256 from '../sha256.js'
import * as identity from '../identity.js'
import * as CBOR from '../cbor.js'

export { ok }
/**
 * @abstract
 * @template [Out=unknown]
 * @template [In=unknown]
 * @template [Settings=void]
 * @extends {Schema.Base<Out, In, Settings>}
 * @implements {Schema.Schema<Out, In>}
 */
export class API {
  /**
   * @param {Settings} settings
   */
  constructor(settings) {
    /** @protected */
    this.settings = settings
  }

  toString() {
    return `new ${this.constructor.name}()`
  }
  /**
   * @abstract
   * @param {In} input
   * @param {Settings} settings
   * @param {Schema.Region} [region]
   * @returns {Schema.ReadResult<Out>}
   */
  /* c8 ignore next 3 */
  readWith(input, settings, region) {
    throw new Error(`Abstract method readWith must be implemented by subclass`)
  }

  /**
   *
   * @param {Out} output
   * @param {Settings} settings
   * @returns {Schema.ReadResult<In>}
   */
  writeWith(output, settings) {
    throw new Error(`Abstract method writeWith must be implemented by subclass`)
  }

  /**
   * @param {unknown} input
   */

  read(input) {
    return this.tryFrom(/** @type {In} */ (input))
  }

  /**
   * @param {In} input
   * @param {Schema.Region} [region]
   * @returns {Schema.ReadResult<Out>}
   */
  tryFrom(input, region) {
    return this.readWith(input, this.settings, region)
  }

  /**
   * @param {Out} output
   * @returns {Schema.ReadResult<In>}
   */
  tryTo(output) {
    return this.writeWith(output, this.settings)
  }

  /**
   * @param {unknown} value
   * @returns {value is Out}
   */
  is(value) {
    return !this.tryFrom(/** @type {In} */ (value))?.error
  }

  /**
   * @param {In} value
   * @return {Out}
   */
  from(value) {
    const result = this.tryFrom(/** @type {In} */ (value))
    if (result.error) {
      throw result.error
    } else {
      return result.ok
    }
  }

  /**
   * @param {Out} value
   */
  to(value) {
    const result = this.tryTo(value)
    if (result.error) {
      throw result.error
    } else {
      return result.ok
    }
  }

  optional() {
    return optional(this)
  }

  nullable() {
    return nullable(this)
  }

  /**
   * @deprecated - use {@link Schema.Schema.implicit} instead
   * @param {Schema.NotUndefined<Out>} value
   */
  default(value) {
    return this.implicit(value)
  }

  /**
   * @param {Schema.NotUndefined<Out>} value
   */
  implicit(value) {
    return implicit(this, value)
  }

  /**
   * @returns {Schema.ArraySchema<Schema.Convert<Out, In>>}
   */
  array() {
    return array(this)
  }
  /**
   * @template I, O
   * @param {Schema.Convert<O, I>} schema
   * @returns {Schema.Schema<Out | O, In | I>}
   */

  or(schema) {
    return or(this, schema)
  }

  /**
   * @template I, O
   * @param {Schema.Convert<O, I>} schema
   * @returns {Schema.Schema<Out & O, In & I>}
   */
  and(schema) {
    return and(this, schema)
  }

  /**
   * @template {Out} O
   * @template {Out} I
   * @param {Schema.Convert<O, I>} schema
   * @returns {Schema.Schema<O, In>}
   */
  refine(schema) {
    return refine(this, schema)
  }

  /**
   * @template O
   * @param {Schema.Convert<O, Out>} to
   * @returns {Schema.Schema<O, In>}
   */
  pipe(to) {
    return pipe(this, to)
  }

  /**
   * @template {string} Kind
   * @param {Kind} [kind]
   * @returns {Schema.Schema<Schema.Branded<Out, Kind>, In>}
   */
  brand(kind) {
    return /** @type {Schema.Schema<Schema.Branded<Out, Kind>, In>} */ (this)
  }

  /**
   * @template {Schema.BlockCodec<Schema.MulticodecCode, In>} Codec
   * @template {Schema.MultihashHasher<Schema.MulticodecCode>} Hasher
   * @template {Schema.UnknownLink['version']} Version
   * @param {{
   * codec?: Codec
   * hasher?: Hasher
   * version?: Version
   * }} options
   * @returns {Schema.LinkSchema<Out, Codec['code'], Hasher['code'], Version>}
   */
  link({ codec, hasher, version } = {}) {
    const schema = link({
      codec,
      hasher,
      version,
      schema: /** @type {Schema.Schema<Out, In>} */ (this),
    })

    return schema
  }

  toSchema() {
    return this
  }
}

/**
 * @extends {API<never, any>}
 * @implements {Schema.Schema<never, any>}
 */
class Never extends API {
  toString() {
    return 'never()'
  }

  /**
   * @param {never} value
   */
  tryTo(value) {
    return value
  }
  /**
   * @param {any} input
   * @returns {Schema.ReadResult<never>}
   */
  tryFrom(input) {
    return typeError({ expect: 'never', actual: input })
  }
}

/**
 * @template [I=unknown]
 * @returns {Schema.Schema<never, I>}
 */
export const never = () => new Never()

/**
 * @extends API<unknown, unknown, void>
 * @implements {Schema.Schema<unknown, unknown>}
 */
class Unknown extends API {
  /**
   * @param {unknown} input
   */
  tryFrom(input) {
    return /** @type {Schema.ReadResult<unknown>}*/ ({ ok: input })
  }
  /**
   * @param {unknown} output
   */
  tryTo(output) {
    return { ok: output }
  }
  toString() {
    return 'unknown()'
  }
}

/**
 * @template [I=unknown]
 * @returns {Schema.Schema<unknown, unknown>}
 */
export const unknown = () => new Unknown()

/**
 * @template I, O
 * @extends {API<null|O, null|I, Schema.Convert<O, I>>}
 * @implements {Schema.Schema<null|O, I|null>}
 */
class Nullable extends API {
  /**
   * @param {I|null} input
   * @param {Schema.Convert<O, I>} convert
   * @param {Schema.Region} [region]
   */
  readWith(input, convert, region) {
    if (input === null) {
      return { ok: null }
    }

    const result = convert.tryFrom(input, region)
    if (result.error) {
      return input === null
        ? { ok: null }
        : {
            error: new UnionError({
              causes: [
                result.error,
                typeError({ expect: 'null', actual: input }).error,
              ],
            }),
          }
    } else {
      return result
    }
  }
  /**
   * @param {O|null} output
   * @param {Schema.Convert<O, I>} writer
   */
  writeWith(output, writer) {
    return output === null ? { ok: null } : writer.tryTo(output)
  }
  toString() {
    return `${this.settings}.nullable()`
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.Convert<O, I>} schema
 * @returns {Schema.Schema<O|null, I | null>}
 */
export const nullable = schema => new Nullable(schema)

/**
 * @template O
 * @template I
 * @extends {API<O|undefined, I|undefined, Schema.Convert<O, I>>}
 * @implements {Schema.Schema<O|undefined, I|undefined>}
 */
class Optional extends API {
  optional() {
    return this
  }
  /**
   * @param {I|undefined} input
   * @param {Schema.Convert<O, I>} convert
   * @param {Schema.Region} [region]
   * @returns {Schema.ReadResult<O|undefined>}
   */
  readWith(input, convert, region) {
    if (input === undefined) {
      return { ok: undefined }
    }
    const result = convert.tryFrom(input, region)
    return result.error && input === undefined ? { ok: undefined } : result
  }
  /**
   *
   * @param {O|undefined} output
   * @param {Schema.Convert} convert
   */
  writeWith(output, convert) {
    return output === undefined ? { ok: undefined } : convert.tryTo(output)
  }
  toString() {
    return `${this.settings}.optional()`
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.Convert<O, I>} schema
 * @returns {Schema.Schema<O|undefined, I|undefined>}
 */
export const optional = schema => new Optional(schema)

/**
 * @template Out
 * @template In
 * @extends {API<Exclude<Out, undefined>, In | undefined, {convert:Schema.Convert<Out, In>, value:Exclude<Out, undefined>}>}
 * @implements {Schema.ImplicitSchema<Out, In>}
 */
class Implicit extends API {
  /**
   * @returns {*}
   */
  optional() {
    return /** @type {*} */ (this)
  }

  /**
   * @param {Exclude<Out, undefined>} value
   */
  implicit(value) {
    return /** @type {*} */ (implicit(this.settings.convert, value))
  }

  /**
   * @param {In|undefined} input
   * @param {object} options
   * @param {Schema.Convert<Out, In>} options.convert
   * @param {Exclude<Out, undefined>} options.value
   * @param {Schema.Region} [region]
   * @returns {Schema.ReadResult<Exclude<Out, undefined>>}
   */
  readWith(input, { convert, value }, region) {
    if (input === undefined) {
      return { ok: value }
    } else {
      const result = convert.tryFrom(input, region)

      return result.error
        ? result
        : result.ok === undefined
        ? { ok: value }
        : // We just checked that result.ok is not undefined but still needs
          // reassurance
          /** @type {*} */ (result)
    }
  }

  /**
   *
   * @param {Exclude<Out, undefined>} output
   * @param {object} options
   * @param {Schema.Convert<Out, In>} options.convert
   */
  writeWith(output, { convert }) {
    return convert.tryTo(output)
  }
  toString() {
    return `${this.settings.convert}.default(${JSON.stringify(
      this.settings.value
    )})`
  }

  /**
   * @returns {Schema.NotUndefined<Out>}
   */
  get value() {
    return /** @type {Schema.NotUndefined<Out>} */ (this.settings.value)
  }
}

/**
 * @template O, I
 * @template {Exclude<O, undefined>} Q
 * @param {Schema.Convert<O, I>} schema
 * @param {Q} value
 * @returns {Schema.ImplicitSchema<O, I>}
 */
export const implicit = (schema, value) => {
  // we also check that fallback is not undefined because that is the point
  // of having a fallback
  if (value === undefined) {
    throw new Error(`Value of type undefined is not a valid default`)
  }

  const implicit = /** @type {Schema.ImplicitSchema<O, I>} */ (
    new Implicit({ convert: schema, value })
  )

  return implicit
}

/**
 * @template {Schema.Convert} Convert
 * @extends {API<Schema.Infer<Convert>[], Schema.InferInput<Convert>[], Convert>}
 * @implements {Schema.ArraySchema<Convert>}
 */
class ArrayOf extends API {
  /**
   * @param {Schema.InferInput<Convert>[]} input
   * @param {Convert} convert
   * @param {Schema.Region} [context]
   */
  readWith(input, convert, context) {
    if (!Array.isArray(input)) {
      return typeError({ expect: 'array', actual: input })
    }
    const results = []
    for (const [index, value] of input.entries()) {
      const result = convert.tryFrom(value, context)
      if (result.error) {
        return memberError({ at: index, cause: result.error })
      } else {
        results.push(result.ok)
      }
    }
    return { ok: results }
  }
  /**
   *
   * @param {Schema.Infer<Convert>[]} output
   * @param {Convert} convert
   */
  writeWith(output, convert) {
    const results = []
    for (const [index, value] of output.entries()) {
      const result = convert.tryTo(value)
      if (result.error) {
        return memberError({ at: index, cause: result.error })
      } else {
        results.push(result.ok)
      }
    }
    return { ok: results }
  }

  get element() {
    return this.settings
  }
  toString() {
    return `array(${this.element})`
  }
}

/**
 * @template O, I
 * @template {Schema.Convert} Schema
 * @param {Schema} schema
 * @returns {Schema.ArraySchema<Schema>}
 */
export const array = schema => {
  const out = new ArrayOf(schema)
  return out
}

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Shape
 * @extends {API<Schema.InferTuple<Shape>, Schema.InferTupleInput<Shape>, Shape>}
 * @implements {Schema.Schema<Schema.InferTuple<Shape>, Schema.InferTupleInput<Shape>>}
 */
class Tuple extends API {
  /**
   * @param {Schema.InferTupleInput<Shape>} input
   * @param {Shape} shape
   * @param {Schema.Region} [context]
   * @returns {Schema.ReadResult<Schema.InferTuple<Shape>>}
   */
  readWith(input, shape, context) {
    if (!Array.isArray(input)) {
      return typeError({ expect: 'array', actual: input })
    }
    if (input.length !== this.shape.length) {
      return error(`Array must contain exactly ${this.shape.length} elements`)
    }

    const results = []
    for (const [index, reader] of shape.entries()) {
      const result = reader.tryFrom(input[index], context)
      if (result.error) {
        return memberError({ at: index, cause: result.error })
      } else {
        results[index] = result.ok
      }
    }

    return { ok: /** @type {Schema.InferTuple<Shape>} */ (results) }
  }
  /**
   *
   * @param {Schema.InferTuple<Shape>} output
   * @param {Shape} shape
   * @returns {Schema.ReadResult<Schema.InferTupleInput<Shape>>}
   */
  writeWith(output, shape) {
    if (!Array.isArray(output)) {
      return typeError({ expect: 'array', actual: output })
    }

    if (output.length !== this.shape.length) {
      return error(`Array must contain exactly ${this.shape.length} elements`)
    }

    const results = []
    for (const [index, writer] of shape.entries()) {
      const result = writer.tryTo(output[index])
      if (result.error) {
        return memberError({ at: index, cause: result.error })
      } else {
        results[index] = result.ok
      }
    }

    return { ok: /** @type {Schema.InferTupleInput<Shape>} */ (results) }
  }

  /** @type {Shape} */
  get shape() {
    return this.settings
  }

  toString() {
    return `tuple([${this.shape.map(member => member.toString()).join(', ')}])`
  }
}

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Shape
 * @param {Shape} shape
 * @returns {Schema.Schema<Schema.InferTuple<Shape>, Schema.InferTupleInput<Shape>>}
 */
export const tuple = shape => new Tuple(shape)

/**
 * @template V
 * @template {string} K
 * @template U
 * @extends {API<Schema.Dictionary<K, V>, Schema.Dictionary<K, U>, { key: Schema.From<K, string>, value: Schema.Convert<V, U> }>}
 * @implements {Schema.DictionarySchema<V, K, U>}
 */
class Dictionary extends API {
  /**
   * @param {Schema.Dictionary<K, U>} input
   * @param {object} schema
   * @param {Schema.From<K, string>} schema.key
   * @param {Schema.From<V, U>} schema.value
   * @param {Schema.Region} [context]
   */
  readWith(input, { key, value }, context) {
    if (typeof input != 'object' || input === null || Array.isArray(input)) {
      return typeError({
        expect: 'dictionary',
        actual: input,
      })
    }

    const dict = /** @type {Schema.Dictionary<K, V>} */ ({})

    for (const [k, v] of Object.entries(input)) {
      const keyResult = key.tryFrom(k, context)
      if (keyResult.error) {
        return memberError({ at: k, cause: keyResult.error })
      }

      const valueResult = value.tryFrom(v, context)
      if (valueResult.error) {
        return memberError({ at: k, cause: valueResult.error })
      }

      // skip undefined because they mess up CBOR and are generally useless.
      if (valueResult.ok !== undefined) {
        dict[keyResult.ok] = valueResult.ok
      }
    }

    return { ok: dict }
  }

  /**
   *
   * @param {Schema.Dictionary<K, V>} output
   * @param {object} schema
   * @param {Schema.From<K, string>} schema.key
   * @param {Schema.To<V, U>} schema.value
   */
  writeWith(output, { key, value }) {
    const dict = /** @type {Schema.Dictionary<K, U>} */ ({})

    for (const [k, v] of Object.entries(output)) {
      const keyResult = key.tryFrom(k)
      if (keyResult.error) {
        return memberError({ at: k, cause: keyResult.error })
      }

      const valueResult = value.tryTo(/** @type {V} */ (v))
      if (valueResult.error) {
        return memberError({ at: k, cause: valueResult.error })
      }

      // skip undefined because they mess up CBOR and are generally useless.
      if (valueResult.ok !== undefined) {
        dict[keyResult.ok] = valueResult.ok
      }
    }

    return { ok: dict }
  }
  get key() {
    return this.settings.key
  }
  get value() {
    return this.settings.value
  }

  partial() {
    const { key, value } = this.settings
    const partial = new Dictionary({
      key,
      value: optional(value),
    })
    return /** @type {*} */ (partial)
  }
  toString() {
    return `dictionary(${this.settings})`
  }
}

/**
 * @template {string} K
 * @template {unknown} V
 * @template {unknown} U
 * @param {object} shape
 * @param {Schema.Convert<V, U>} shape.value
 * @param {Schema.From<K, string>} [shape.key]
 * @returns {Schema.DictionarySchema<V, K, U>}
 */
export const dictionary = ({ value, key }) =>
  new Dictionary({
    value,
    key: key || /** @type {Schema.From<K, string>} */ (string()),
  })

/**
 * @template {string} T
 * @template {[T, ...T[]]} U
 * @extends {API<U[number], string, {type: string, variants:Set<U[number]>}>}
 * @implements {Schema.Schema<U[number], string>}
 */
class Enum extends API {
  /**
   * @param {string} input
   * @param {{type:string, variants:Set<U[number]>}} settings
   * @returns {Schema.ReadResult<U[number]>}
   */
  readWith(input, { variants, type }) {
    if (variants.has(/** @type {T} */ (input))) {
      return /** @type {Schema.ReadResult<U[number]>} */ ({ ok: input })
    } else {
      return typeError({ expect: type, actual: input })
    }
  }
  /**
   * @param {U[number]} output
   * @param {{type:string, variants:Set<T[number]>}} settings
   */
  writeWith(output, settings) {
    if (settings.variants.has(output)) {
      return { ok: output }
    } else {
      return typeError({ expect: settings.type, actual: output })
    }
  }
  toString() {
    return this.settings.type
  }
}

/**
 * @template {string} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} variants
 * @returns {Schema.Schema<U[number], string>}
 */
const createEnum = variants =>
  new Enum({
    type: variants.join('|'),
    variants: new Set(variants),
  })
export { createEnum as enum }

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Members
 * @extends {API<Schema.InferUnion<Members>, Schema.InferUnionInput<Members>, Members>}
 * @implements {Schema.Schema<Schema.InferUnion<Members>, Schema.InferUnionInput<Members>>}
 */
class Union extends API {
  /**
   * @param {Schema.InferUnionInput<Members>} input
   * @param {Members} variants
   * @param {Schema.Region} [context]
   */
  readWith(input, variants, context) {
    const causes = []
    for (const reader of variants) {
      const result = reader.tryFrom(input, context)
      if (result.error) {
        causes.push(result.error)
      } else {
        return /** @type {Schema.ReadResult<Schema.InferUnion<Members>>} */ (
          result
        )
      }
    }
    return { error: new UnionError({ causes }) }
  }
  /**
   * @param {Schema.InferUnion<Members>} output
   * @param {Members} variants
   */
  writeWith(output, variants) {
    const causes = []
    for (const member of variants) {
      const result = member.tryTo(output)
      if (result.error) {
        causes.push(result.error)
      } else {
        return /** @type {Schema.ReadResult<Schema.InferUnionInput<Members>>} */ (
          result
        )
      }
    }
    return { error: new UnionError({ causes }) }
  }

  get members() {
    return this.settings
  }
  toString() {
    return `union([${this.members
      .map(member => member.toString())
      .join(', ')}])`
  }
}

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Members
 * @param {Members} members
 * @returns {Schema.Schema<Schema.InferUnion<Members>, Schema.InferUnionInput<Members>>}
 */
const union = members => new Union(members)

/**
 * @template O, Q, I, J
 * @param {Schema.Convert<O, I>} left
 * @param {Schema.Convert<Q, J>} right
 * @returns {Schema.Schema<O|Q, I|J>}
 */
export const or = (left, right) => union([left, right])

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Members
 * @extends {API<Schema.InferIntersection<Members>, Schema.InferIntersectionInput<Members>, Members>}
 * @implements {Schema.Schema<Schema.InferIntersection<Members>, Schema.InferIntersectionInput<Members>>}
 */
class Intersection extends API {
  /**
   * @param {Schema.InferIntersectionInput<Members>} input
   * @param {Members} schemas
   * @param {Schema.Region} [context]
   * @returns {Schema.ReadResult<Schema.InferIntersection<Members>>}
   */
  readWith(input, schemas, context) {
    const causes = []
    for (const schema of schemas) {
      const result = schema.tryFrom(input, context)
      if (result.error) {
        causes.push(result.error)
      }
    }

    return causes.length > 0
      ? { error: new IntersectionError({ causes }) }
      : /** @type {Schema.ReadResult<Schema.InferIntersection<Members>>} */ ({
          ok: input,
        })
  }
  /**
   * @param {Schema.InferIntersection<Members>} output
   * @param {Members} members
   * @returns {Schema.ReadResult<Schema.InferIntersectionInput<Members>>}
   */
  writeWith(output, members) {
    const causes = []
    for (const member of members) {
      const result = member.tryTo(output)
      if (result.error) {
        causes.push(result.error)
      }
    }

    return causes.length > 0
      ? { error: new IntersectionError({ causes }) }
      : /** @type {Schema.ReadResult<Schema.InferIntersectionInput<Members>>} */ ({
          ok: output,
        })
  }
  get members() {
    return this.settings
  }
  toString() {
    return `intersection([${this.members
      .map(member => member.toString())
      .join(',')}])`
  }
}

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Members
 * @param {Members} members
 * @returns {Schema.Schema<Schema.InferIntersection<Members>, Schema.InferIntersectionInput<Members>>}
 */
export const intersection = members => new Intersection(members)

/**
 * @template O, Q, I, J
 * @param {Schema.Convert<O, I>} left
 * @param {Schema.Convert<Q, J>} right
 * @returns {Schema.Schema<O & Q, I & J>}
 */
export const and = (left, right) => intersection([left, right])

/**
 * @template {string|number|boolean|null} Type
 * @template {string} Name
 * @extends {API<Type, Type, {name: Name, cast(input:Type): Schema.ReadResult<Type>}>}
 */
class Scalar extends API {
  /**
   * @param {Type} input
   * @param {typeof this.settings} settings
   */
  readWith(input, { cast }) {
    return cast(input)
  }
  /**
   * @param {Type} output
   * @param {typeof this.settings} settings
   */
  writeWith(output, { cast }) {
    return cast(output)
  }
  toString() {
    return `${this.settings.name}()`
  }
}

export const Boolean = new Scalar({
  name: 'boolean',
  /**
   * @param {boolean} input
   */
  cast(input) {
    switch (input) {
      case true:
      case false:
        return { ok: /** @type {boolean} */ (input) }
      default:
        return typeError({
          expect: 'boolean',
          actual: input,
        })
    }
  },
})
export const boolean = () => Boolean

/**
 * @template {number} Out
 * @template {number} In
 * @template [Settings=void]
 * @extends {API<Out, In, Settings>}
 * @implements {Schema.NumberSchema<Out, In>}
 */
class NumberSchema extends API {
  isInteger = globalThis.Number.isInteger
  isFinite = globalThis.Number.isFinite

  /**
   * @param {(input: Out) => Schema.ReadResult<Out>} check
   * @returns {Schema.NumberSchema<Out, In>}
   */
  constraint(check) {
    return this.refine({
      tryFrom: check,
      tryTo: check,
    })
  }

  /**
   * @param {number} n
   */
  greaterThan(n) {
    return this.constraint(number => {
      if (number > n) {
        return { ok: number }
      } else {
        return error(`Expected ${number} > ${n}`)
      }
    })
  }
  /**
   * @param {number} n
   */
  lessThan(n) {
    return this.constraint(number => {
      if (number < n) {
        return { ok: number }
      } else {
        return error(`Expected ${number} < ${n}`)
      }
    })
  }

  /**
   * @template {Out} O
   * @template {Out} I
   * @param {Schema.Convert<O, I>} convert
   * @returns {Schema.NumberSchema<O, In>}
   */
  refine(convert) {
    return new RefinedNumber({ schema: this, refine: convert })
  }

  /**
   * @param {In} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<Out>}
   */
  readWith(input, settings) {
    return typeof input === 'number'
      ? { ok: /** @type {*} */ (input) }
      : typeError({ expect: 'number', actual: input })
  }
  /**
   * @param {Out} output
   * @param {Settings} settings
   * @returns {Schema.ReadResult<In>}
   */
  writeWith(output, settings) {
    return typeof output === 'number'
      ? { ok: /** @type {*} */ (output) }
      : typeError({ expect: 'number', actual: output })
  }
  toString() {
    return `number()`
  }
}

/** @type {Schema.NumberSchema<number, number>} */
export const Number = new NumberSchema(undefined)
export const number = () => Number

/**
 * @template {number} Out
 * @template {number} In
 * @template {Out} O
 * @template {Out} I
 * @extends {NumberSchema<O, In, {schema: Schema.Convert<Out, In>, refine:Schema.From<O, I>}>}
 * @implements {Schema.NumberSchema<O, In>}
 */
class RefinedNumber extends NumberSchema {
  /**
   * @param {In} input
   * @param {{schema: Schema.Convert<Out, In>, refine: Schema.Convert<O, I> } } settings
   * @returns {Schema.ReadResult<O>}
   */
  readWith(input, { schema, refine }) {
    const result = schema.tryFrom(input)
    return result.error ? result : refine.tryFrom(/** @type {I} */ (result.ok))
  }

  /**
   * @param {O} output
   * @param {{schema: Schema.Convert<Out, In>, refine: Schema.Convert<O, I> } } settings
   */
  writeWith(output, { schema, refine }) {
    const result = refine.tryTo(output)
    return result.error ? result : schema.tryTo(result.ok)
  }

  toString() {
    return `${this.settings.schema}.refine(${this.settings.refine})`
  }
}

/**
 * @extends {NumberSchema<Schema.Integer, number, void>}
 */
class IntegerSchema extends NumberSchema {
  /**
   * @param {number} number
   * @returns {Schema.ReadResult<Schema.Integer>}
   */
  static validate(number) {
    return Number.isInteger(number)
      ? { ok: /** @type {Schema.Integer} */ (number) }
      : typeError({
          expect: 'integer',
          actual: number,
        })
  }
  /**
   * @param {number} number
   * @returns {Schema.ReadResult<Schema.Integer>}
   */
  tryFrom(number) {
    return IntegerSchema.validate(number)
  }
  /**
   * @param {Schema.Integer} number
   * @returns {Schema.ReadResult<number>}
   */
  tryTo(number) {
    return IntegerSchema.validate(number)
  }
  toString() {
    return `Integer`
  }
}
/** @type {Schema.NumberSchema<Schema.Integer, number>} */
const Integer = new IntegerSchema()
export const integer = () => Integer

/**
 * @extends {NumberSchema<Schema.Float, number, void>}
 */
class FloatSchema extends NumberSchema {
  /**
   * @param {number} number
   * @returns {Schema.ReadResult<Schema.Float>}
   */
  static validate(number) {
    return Number.isFinite(number)
      ? { ok: /** @type {Schema.Float} */ (number) }
      : typeError({
          expect: 'Float',
          actual: number,
        })
  }
  /**
   * @param {number} number
   * @returns {Schema.ReadResult<Schema.Float>}
   */
  tryFrom(number) {
    return FloatSchema.validate(number)
  }
  /**
   * @param {Schema.Float} number
   * @returns {Schema.ReadResult<Schema.Float>}
   */
  tryTo(number) {
    return FloatSchema.validate(number)
  }
  toString() {
    return 'Float'
  }
}

const Float = new FloatSchema()
export const float = () => Float

/**
 * @template {string} Out
 * @template {string} In
 * @template [Settings=void]
 * @extends {API<Out, In, Settings>}
 * @implements {Schema.StringSchema<Out, In>}
 */
class StringSchema extends API {
  /**
   * @template {string} Source
   * @param {Source} source
   * @returns {Schema.ReadResult<Source>}
   */
  static validate(source) {
    return typeof source === 'string'
      ? { ok: source }
      : typeError({ expect: 'string', actual: source })
  }
  /**
   * @param {In} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<Out>}
   */
  readWith(input, settings) {
    return StringSchema.validate(/** @type {In & Out} */ (input))
  }

  /**
   * @param {Out} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<In>}
   */
  writeWith(input, settings) {
    return StringSchema.validate(/** @type {In & Out} */ (input))
  }

  /**
   * @template {Out} O
   * @template {Out} I
   * @param {Schema.Convert<O, I>} schema
   * @returns {Schema.StringSchema<O, In>}
   */
  refine(schema) {
    const refined = new RefinedString({
      base: this,
      schema,
    })

    return /** @type {Schema.StringSchema<O, In>} */ (refined)
  }

  /**
   * @param {(value: Out) => Schema.ReadResult<Out>} check
   * @returns {Schema.StringSchema<Out, In>}
   */
  constraint(check) {
    return this.refine({
      tryFrom: check,
      tryTo: check,
    })
  }
  /**
   * @template {string} Prefix
   * @param {Prefix} prefix
   */
  startsWith(prefix) {
    const constraint =
      /** @type {Schema.Convert<Out & `${Prefix}${string}`, Out>} */ (
        startsWith(prefix)
      )

    return this.refine(constraint)
  }

  /**
   * @template {string} Suffix
   * @param {Suffix} suffix
   */
  endsWith(suffix) {
    const constraint =
      /** @type {Schema.Convert<Out & `${string}${Suffix}`, Out>} */ (
        endsWith(suffix)
      )

    return this.refine(constraint)
  }
  toString() {
    return `string()`
  }
}

/**
 * @template {string} Out
 * @template {string} In
 * @template {Out} O
 * @template {Out} I
 * @extends {StringSchema<O, In, {base:Schema.Convert<Out, In>, schema:Schema.Convert<O, I>}>}
 * @implements {Schema.StringSchema<O, In>}
 */
class RefinedString extends StringSchema {
  /**
   * @param {In} input
   * @param {{base:Schema.From<Out, In>, schema:Schema.From<O, I>}} settings
   * @returns {Schema.ReadResult<O>}
   */
  readWith(input, { base, schema }) {
    const result = base.tryFrom(input)
    return result.error ? result : schema.tryFrom(/** @type {I} */ (result.ok))
  }

  /**
   * @param {O} output
   * @param {{base:Schema.To<Out, In>, schema:Schema.To<O, I>}} settings
   * @returns {Schema.ReadResult<In>}
   */
  writeWith(output, { base, schema }) {
    const result = schema.tryTo(output)
    return result.error ? result : base.tryTo(result.ok)
  }

  toString() {
    return `${this.settings.base}.refine(${this.settings.schema})`
  }
}

/** @type {Schema.StringSchema<string, string>} */
export const String = new StringSchema(undefined)
export const string = () => String

/**
 * @template {string} Prefix
 * @template {string} In
 * @extends {API<`${Prefix}${string}` & In, In, Prefix>}
 * @implements {Schema.Schema<`${Prefix}${string}` & In, In>}
 */
class StartsWith extends API {
  /**
   * @param {In} input
   * @param {Prefix} prefix
   */
  readWith(input, prefix) {
    const result = input.startsWith(prefix)
      ? /** @type {Schema.ReadResult<`${Prefix}${string}` & In>} */ ({
          ok: input,
        })
      : error(`Expect string to start with "${prefix}" instead got "${input}"`)

    return result
  }
  get prefix() {
    return this.settings
  }
  toString() {
    return `startsWith("${this.prefix}")`
  }
}

/**
 * @template {string} Prefix
 * @template {string} Input
 * @param {Prefix} prefix
 * @returns {Schema.Schema<Input & `${Prefix}${string}`, Input>}
 */
export const startsWith = prefix => new StartsWith(prefix)

/**
 * @template {string} Suffix
 * @template {string} Body
 * @extends {API<Body & `${string}${Suffix}`, Body, Suffix>}
 */
class EndsWith extends API {
  /**
   * @param {Body} input
   * @param {Suffix} suffix
   */
  readWith(input, suffix) {
    return input.endsWith(suffix)
      ? /** @type {Schema.ReadResult<Body & `${string}${Suffix}`>} */ ({
          ok: input,
        })
      : error(`Expect string to end with "${suffix}" instead got "${input}"`)
  }
  get suffix() {
    return this.settings
  }
  toString() {
    return `endsWith("${this.suffix}")`
  }
}

/**
 * @template {string} Suffix
 * @template {string} Input
 * @param {Suffix} suffix
 * @returns {Schema.Schema<`${string}${Suffix}` & Input, Input>}
 */
export const endsWith = suffix => new EndsWith(suffix)

/**
 * @template Out
 * @template {Out} O
 * @template {Out} I
 * @template In
 * @extends {API<O, In, { base: Schema.Convert<Out, In>, schema: Schema.Convert<O, I> }>}
 * @implements {Schema.Schema<O, In>}
 */

class Refine extends API {
  /**
   * @param {In} input
   * @param {{ base: Schema.Convert<Out, In>, schema: Schema.Convert<O, I> }} settings
   * @param {Schema.Region} [context]
   */
  readWith(input, { base, schema }, context) {
    const result = base.tryFrom(input, context)
    return result.error
      ? result
      : schema.tryFrom(/** @type {I} */ (result.ok), context)
  }
  /**
   * @param {O} output
   * @param {{ base: Schema.Convert<Out, In>, schema: Schema.Convert<O, I> }} settings
   */
  writeWith(output, { base, schema }) {
    const result = schema.tryTo(output)
    return result.error ? result : base.tryTo(/** @type {Out} */ (result.ok))
  }
  toString() {
    return `${this.settings.base}.refine(${this.settings.schema})`
  }
}

/**
 * @template {Out} O
 * @template {Out} I
 * @template Out
 * @template In
 * @param {Schema.Convert<Out, In>} base
 * @param {Schema.Convert<O, I>} schema
 * @returns {Schema.Schema<O, In>}
 */
export const refine = (base, schema) => new Refine({ base, schema })

/**
 * @template Into
 * @template Out
 * @template In
 * @extends {API<Into, In, { from: Schema.Convert<Out, In>, to: Schema.Convert<Into, Out> }>}
 * @implements {Schema.Schema<Into, In>}
 */
class Pipe extends API {
  /**
   * @param {In} input
   * @param {{ from: Schema.From<Out, In>, to: Schema.From<Into, Out> }} settings
   * @param {Schema.Region} [context]
   */
  readWith(input, { from, to }, context) {
    const result = from.tryFrom(input, context)
    return result.error ? result : to.tryFrom(result.ok, context)
  }
  /**
   * @param {Into} output
   * @param {{ from: Schema.To<Out, In>, to: Schema.To<Into, Out> }} settings
   */
  writeWith(output, { from, to }) {
    const result = to.tryTo(output)
    return result.error ? result : from.tryTo(result.ok)
  }
  toString() {
    return `${this.settings.from}.pipe(${this.settings.to})`
  }
}

/**
 * @template Into
 * @template Out
 * @template In
 * @param {Schema.Convert<Out, In>} from
 * @param {Schema.Convert<Into, Out>} to
 * @returns {Schema.Schema<Into, In>}
 */
export const pipe = (from, to) => new Pipe({ from, to })

/**
 * @template {null|boolean|string|number} Out
 * @template {null|boolean|string|number} In
 * @extends {API<Out, In, Out>}
 * @implements {Schema.LiteralSchema<Out, In>}
 */
class Literal extends API {
  /**
   * @param {In} input
   * @param {Out} expect
   * @returns {Schema.ReadResult<Out>}
   */
  readWith(input, expect) {
    return input !== /** @type {unknown} */ (expect)
      ? { error: new LiteralError({ expect, actual: input }) }
      : { ok: expect }
  }
  get value() {
    return /** @type {Exclude<Out, undefined>} */ (this.settings)
  }
  /**
   * @param {Out} value
   */
  implicit(value = this.value) {
    return implicit(this, /** @type {Exclude<Out, undefined>} */ (value))
  }
  toString() {
    return `literal(${displayTypeName(this.value)})`
  }
}

/**
 * @template {null|boolean|string|number} Out
 * @template {null|boolean|string|number} In
 * @param {Out} value
 * @returns {Schema.LiteralSchema<Out, In>}
 */
export const literal = value => new Literal(value)

/**
 * @template {Schema.StructMembers} Members
 * @extends {API<Schema.InferStruct<Members>, Schema.InferStructInput<Members>, {shape: Members}>}
 * @implements {Schema.StructSchema<Members>}
 */
class Struct extends API {
  /**
   * @param {Schema.InferStructInput<Members>} input
   * @param {{shape: Members}} settings
   * @param {Schema.Region} [context]
   * @returns {Schema.ReadResult<Schema.InferStruct<Members>>}
   */
  readWith(input, { shape }, context) {
    if (typeof input != 'object' || input === null || Array.isArray(input)) {
      return typeError({
        expect: 'object',
        actual: input,
      })
    }

    const source = /** @type {{[K in keyof Members]: unknown}} */ (input)

    const struct =
      /** @type {{[K in keyof Members]: Schema.Infer<Members[K]>}} */ ({})
    const entries =
      /** @type {{[K in keyof Members]: [K & string, Members[K]]}[keyof Members][]} */ (
        Object.entries(shape)
      )

    for (const [at, reader] of entries) {
      const result = reader.tryFrom(source[at], context)
      if (result.error) {
        return memberError({ at, cause: result.error })
      }
      // skip undefined because they mess up CBOR and are generally useless.
      else if (result.ok !== undefined) {
        struct[at] = /** @type {Schema.Infer<Members[typeof at]>} */ (result.ok)
      }
    }

    return { ok: struct }
  }

  /**
   * @param {Schema.InferStruct<Members>} output
   * @param {{shape: Members}} settings
   */

  writeWith(output, { shape }) {
    if (typeof output != 'object' || output === null || Array.isArray(output)) {
      return typeError({
        expect: 'object',
        actual: output,
      })
    }

    const source = /** @type {{[K in keyof Members]: unknown}} */ (output)

    const input =
      /** @type {{[K in keyof Members]: Schema.InferInput<Members[K]>}} */ ({})
    const entries =
      /** @type {{[K in keyof Members]: [K & string, Members[K]]}[keyof Members][]} */ (
        Object.entries(shape)
      )

    for (const [at, writer] of entries) {
      const result = writer.tryTo(source[at])
      if (result.error) {
        return memberError({ at, cause: result.error })
      }
      // skip undefined because they mess up CBOR and are generally useless.
      else if (result.ok !== undefined) {
        input[at] = /** @type {Schema.InferInput<Members[typeof at]>} */ (
          result.ok
        )
      }
    }

    return { ok: input }
  }

  partial() {
    const shape = Object.fromEntries(
      Object.entries(this.shape).map(([key, value]) => [key, optional(value)])
    )

    return /** @type {*} */ (new Struct({ shape }))
  }

  /** @type {Members} */
  get shape() {
    return this.settings.shape
  }

  toString() {
    return [
      `struct({ `,
      ...Object.entries(this.shape).map(
        ([key, schema]) => `${key}: ${schema}, `
      ),
      `})`,
    ].join('')
  }

  /**
   * @param {Schema.InferStructSource<Members>} data
   */
  create(data) {
    return this.from(/** @type {*} */ (data || {}))
  }

  /**
   * @template {Schema.StructMembers} E
   * @param {E} extension
   * @returns {Schema.StructSchema<Members & E>}
   */
  extend(extension) {
    return new Struct({ shape: { ...this.shape, ...extension } })
  }
}

/**
 * @template {null|boolean|string|number} T
 * @template {{[key:string]: T|Schema.Convert}} U
 * @template {{[K in keyof U]: U[K] extends Schema.Convert ? U[K] : Schema.Convert<U[K] & T>}} Members
 * @param {U} fields
 * @returns {Schema.StructSchema<Members>}
 */
export const struct = fields => {
  const shape = /** @type {{[K in keyof U]: Schema.Convert}} */ ({})
  /** @type {[keyof U & string, T|Schema.Convert][]} */
  const entries = Object.entries(fields)

  for (const [key, field] of entries) {
    switch (typeof field) {
      case 'number':
      case 'string':
      case 'boolean':
        shape[key] = literal(field)
        break
      case 'object':
        shape[key] = field === null ? literal(null) : field
        break
      default:
        throw new Error(
          `Invalid struct field "${key}", expected schema or literal, instead got ${typeof field}`
        )
    }
  }

  return /** @type {*} */ (new Struct({ shape: shape }))
}

/**
 * @extends {API<Uint8Array, Uint8Array, void>}
 * @implements {Schema.BytesSchema<Uint8Array, Schema.MulticodecCode<0x55, 'raw'>>}
 */
class RawBytes extends API {
  name = 'raw'
  code = /** @type {const} */ (0x55)

  /**
   * @param {Uint8Array} input
   */
  encode(input) {
    if (input instanceof Uint8Array) {
      return input
    } else {
      throw typeError({ expect: 'Uint8Array', actual: input }).error
    }
  }

  /**
   * @param {Uint8Array} output
   */
  decode(output) {
    if (output instanceof Uint8Array) {
      return output
    } else {
      throw typeError({ expect: 'Uint8Array', actual: output }).error
    }
  }
  /**
   * @param {Uint8Array} input
   * @returns {Schema.ReadResult<Uint8Array>}
   */
  readWith(input) {
    if (input instanceof Uint8Array) {
      return { ok: input }
    } else {
      return typeError({ expect: 'Uint8Array', actual: input })
    }
  }

  /**
   * @template {Uint8Array} O
   * @template {Uint8Array} I
   * @param {Schema.Convert<O, I>} into
   * @returns {Schema.BytesSchema<O, typeof this.code>}
   */
  refine(into) {
    const codec = /** @type {Schema.BlockCodec<0x55, * & I>} */ (this)
    return new ByteView({ codec, convert: into })
  }
}

/** @type {Schema.BytesSchema} */
export const Bytes = new RawBytes()

/**
 * @type {Schema.Convert<*>}
 */
const direct = {
  tryFrom: input => input,
  tryTo: output => output,
}

/**
 * @template {Schema.BlockCodec<number, any>} [Codec=import('multiformats/codecs/raw')]
 * @param {Codec} [codec]
 * @returns {Schema.BytesSchema<ReturnType<Codec['decode']> & ({} | null), Schema.MulticodecCode<Codec['code'], Codec['name']>>}
 */
export const bytes = codec =>
  /** @type {*} */ (codec ? new ByteView({ codec, convert: direct }) : Bytes)

/**
 * @template {{}|null} Model
 * @template {Model} Out
 * @template {Schema.MulticodecCode} Code
 * @extends {API<Out, Schema.ByteView<Model>, Schema.ByteSchemaSettings<Model, Out, Code>>}
 * @implements {Schema.BytesSchema<Out, Code>}
 */
class ByteView extends API {
  get codec() {
    return this.settings.codec
  }
  get name() {
    return this.codec.name
  }
  get code() {
    return this.codec.code
  }
  /**
   * @param {Out} data
   */
  encode(data) {
    const { codec, convert } = this.settings
    const model = convert.tryFrom(data)
    if (model.error) {
      throw model.error
    } else {
      return /** @type {Schema.ByteView<Out>} */ (codec.encode(model.ok))
    }
  }
  /**
   * @param {Schema.ByteView<Out>} bytes
   */
  decode(bytes) {
    const { codec, convert } = this.settings
    const model = codec.decode(bytes)
    const result = convert.tryFrom(model)
    if (result.error) {
      throw result.error
    } else {
      return result.ok
    }
  }
  /**
   * @param {Uint8Array} input
   * @param {Schema.ByteSchemaSettings<Model, Out, Code>} settings
   * @returns {Schema.ReadResult<Out>}
   */
  readWith(input, { codec, convert }) {
    try {
      const model = codec.decode(input)
      return convert.tryFrom(model)
    } catch (cause) {
      return { error: /** @type {Error} */ (cause) }
    }
  }
  /**
   *
   * @param {Out} output
   * @param {Schema.ByteSchemaSettings<Model, Out, Code>} settings
   * @returns {Schema.ReadResult<Schema.ByteView<Out>>}
   */
  writeWith(output, { codec, convert }) {
    try {
      const result = convert.tryTo(output)
      if (result.error) {
        throw result.error
      }
      return {
        ok: /** @type {Schema.ByteView<Out>} */ (codec.encode(result.ok)),
      }
    } catch (cause) {
      return { error: /** @type {Error} */ (cause) }
    }
  }

  /**
   * @template {Out} O
   * @template {Out} I
   * @param {Schema.Convert<O, I>} into
   * @returns {Schema.BytesSchema<O, Code>}
   */
  refine(into) {
    const { codec, convert: from } = this.settings
    const convert =
      from === direct
        ? // if convertor is direct, we don't need to compose
          /** @type {Schema.Convert<O, * & Model>} */ (into)
        : pipe(/** @type {Schema.Convert<* & I, Model>} */ (from), into)

    return new ByteView({
      codec,
      convert,
    })
  }
}

const emptyStore = Object.freeze(new Map())
/**
 * @template {{}|null} T
 * @param {object} options
 * @param {Schema.BlockCodec<number, any>} options.codec
 * @returns {Schema.Schema<T, { root: Schema.Link, store: Map<string, Schema.Block>}>}
 */
export const dag = options => {
  throw new Error('Not implemented')
}

/**
 * @template {unknown} Out
 * @template {unknown} In
 * @template {Schema.MulticodecCode} Code
 * @template {Schema.MulticodecCode} Alg
 * @template {Schema.UnknownLink['version']} V
 * @implements {Schema.LinkOf<Out, Code, Alg, V>}
 */
class Link {
  /**
   * @param {object} source
   * @param {Schema.Link<Out, Code, Alg, V>} source.link
   * @param {Schema.BlockCodec<Code, In>} [source.codec]
   * @param {Schema.Convert<Out, In>} source.schema
   * @param {Schema.Region} [source.store]
   */
  constructor({ link, codec, schema }) {
    this.codec = codec
    this.cid = link
    this.schema = schema

    this['/'] = link.bytes
    this.version = link.version
    this.multihash = link.multihash
    this.code = link.code
    this.bytes = link.bytes

    Object.defineProperties(this, {
      codec: { enumerable: false },
      cid: { enumerable: false },
      schema: { enumerable: false },
    })
  }

  /**
   * @param {Schema.Region} region
   * @returns {Schema.Attachment<Out, Code, Alg, V>}
   */
  select(region) {
    const { cid, codec, schema } = this
    const block = region.get(`${cid}`)
    const bytes = block
      ? block.bytes
      : cid.multihash.code === identity.code
      ? cid.multihash.digest
      : undefined

    if (bytes) {
      return new Attachment({
        root: { cid, bytes },
        codec,
        schema,
        store: region,
      })
    } else {
      throw new RangeError(
        `Block can not be resolved, please provide a store from which to resolve it`
      )
    }
  }

  /**
   * @param {Schema.Region} region
   * @returns {Schema.ResolvedLink<Out, Code, Alg, V>}
   */
  resolve(region) {
    return this.select(region).resolve()
  }
  // get version() {
  //   return this.cid.version
  // }
  // get code() {
  //   return this.cid.code
  // }
  // get multihash() {
  //   return this.cid.multihash
  // }
  get byteOffset() {
    return this.cid.byteOffset
  }
  get byteLength() {
    return this.cid.byteLength
  }
  // get bytes() {
  //   return this.cid.bytes
  // }
  link() {
    return this.cid
  }
  /**
   * @param {unknown} other
   * @returns {other is Schema.Link<Out, Code, Alg, V>}
   */
  equals(other) {
    return this.cid.equals(other)
  }
  /**
   * @template {string} Prefix
   * @param {Schema.MultibaseEncoder<Prefix>} [base]
   * @returns
   */
  toString(base) {
    return this.cid.toString(base)
  }
  toJSON() {
    return { '/': this.toString() }
  }
  get [Symbol.toStringTag]() {
    return 'CID'
  }
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `CID(${this.toString()})`
  }
  toV1() {
    return this.cid.toV1()
  }
}

/**
 * @template {unknown} Out
 * @template {unknown} In
 * @template {Schema.MulticodecCode} Code
 * @template {Schema.MulticodecCode} Alg
 * @template {Schema.UnknownLink['version']} V
 * @implements {Schema.Attachment<Out, Code, Alg, V>}
 */
class Attachment {
  /**
   * @param {object} source
   * @param {Schema.Block<Out, Code, Alg, V>} source.root
   * @param {Schema.BlockCodec<Code, In>} [source.codec]
   * @param {Schema.Convert<Out, In>} source.schema
   * @param {Schema.Region} [source.store]
   */
  constructor({ root, codec, schema, store = emptyStore }) {
    this.codec = codec
    this.root = root
    this.store = store
    this.schema = schema
    this['/'] = root.cid.bytes

    /** @type {Schema.ReadResult<Out>|null} */
    this._resolved = null
  }

  /**
   * @returns {Schema.ResolvedLink<Out, Code, Alg, V>}
   */
  resolve() {
    let result = this._resolved
    if (result == null) {
      const { schema, codec = CBOR, root } = this
      const data = codec.decode(/** @type {Uint8Array} */ (root.bytes))
      result = schema.tryFrom(data, this.store)

      this._resolved = result
    }

    if (result.error) {
      throw result.error
    } else {
      return /** @type {Schema.ResolvedLink<Out, Code, Alg, V>} */ (result.ok)
    }
  }
  get version() {
    return this.root.cid.version
  }
  get code() {
    return this.root.cid.code
  }
  get multihash() {
    return this.root.cid.multihash
  }
  get byteOffset() {
    return this.root.cid.byteOffset
  }
  get byteLength() {
    return this.root.cid.byteLength
  }
  get bytes() {
    return this.root.cid.bytes
  }
  link() {
    return this.root.cid
  }
  /**
   * @param {unknown} other
   * @returns {other is Schema.Link<Out, Code, Alg, V>}
   */
  equals(other) {
    return this.root.cid.equals(other)
  }
  /**
   * @template {string} Prefix
   * @param {Schema.MultibaseEncoder<Prefix>} [base]
   * @returns
   */
  toString(base) {
    return this.root.cid.toString(base)
  }
  toV1() {
    return this.root.cid.toV1()
  }
  /**
   * @param {object} context
   * @param {Schema.Region} [context.store]
   */
  with({ store = this.store }) {
    return new Attachment({
      root: this.root,
      codec: this.codec,
      schema: this.schema,
      store,
    })
  }

  *iterateIPLDBlocks() {
    const dag = this.resolve()
    const { store, root } = this
    for (const link of Attachment.links(dag)) {
      const block = store.get(`${link}`)
      if (block) {
        yield { cid: link, bytes: block.bytes }
      }
    }

    yield /** @type {Schema.Block} */ (root)
  }

  /**
   * @param {unknown} source
   * @returns {IterableIterator<Schema.Link>}
   */
  static *links(source) {
    if (isLink(source)) {
      yield /** @type {Schema.Link} */ (source)
    } else if (source && typeof source === 'object') {
      for (const value of Object.values(source)) {
        yield* this.links(value)
      }
    }
  }

  /**
   * @param {unknown} source
   */
  static *iterateIPLDBlocks(source) {
    if (source && typeof source === 'object') {
      for (const value of Object.values(source)) {
        if (value && typeof value['iterateIPLDBlocks'] === 'function') {
          yield* value.iterateIPLDBlocks()
        }
      }
    }
  }
}

/**
 * @template {unknown} [Out=unknown]
 * @template {unknown} [In=number]
 * @template {number} [Code=number]
 * @template {number} [Alg=number]
 * @template {1|0} [Version=0|1]
 * @typedef {{
 * codec?: Schema.BlockCodec<Code, In>,
 * version?: Version
 * hasher?: {code: Alg}
 * schema: Schema.Schema<Out, In>
 * }} LinkSettings
 */

/**
 * @template {unknown} Out
 * @template {unknown} In
 * @template {Schema.MulticodecCode} Code
 * @template {Schema.MulticodecCode} Alg
 * @template {Schema.UnknownLink['version']} V
 * @extends {API<Schema.LinkOf<Out, Code, Alg, V>, Schema.IntoLink<Out>, LinkSettings<Out, In, Code, Alg, V>>}
 * @implements {Schema.LinkSchema<Out, Code, Alg, V>}
 */
class LinkSchema extends API {
  /**
   * @template {unknown} Out
   * @template {unknown} In
   * @template {Schema.MulticodecCode} Code
   * @template {Schema.MulticodecCode} Alg
   * @template {Schema.UnknownLink['version']} V
   * @param {Schema.IntoLink<Out>} source
   * @param {LinkSettings<Out, In, Code, Alg, V>} settings
   * @returns {Schema.ReadResult<Schema.Link<Out, Code, Alg, V>>}
   */
  static validate(source, { codec, hasher, version, schema }) {
    if (source == null) {
      return error(`Expected link but got ${source} instead`)
    } else {
      if (!isLink(source)) {
        return error(`Expected link to be a CID instead of ${source}`)
      } else {
        if (codec && codec.code !== source.code) {
          return error(
            `Expected link to be CID with 0x${codec.code.toString(16)} codec`
          )
        }

        if (hasher && hasher.code !== source.multihash.code)
          return error(
            `Expected link to be CID with 0x${hasher.code.toString(
              16
            )} hashing algorithm`
          )

        if (version != null && version !== source.version) {
          return error(
            `Expected link to be CID version ${version} instead of ${source.version}`
          )
        }

        const link = /** @type {Schema.Link<Out, *, *, *>} */ (source)
        return { ok: link }
      }
    }
  }

  /**
   * @param {Schema.IntoLink<Out>} cid
   * @param {LinkSettings<Out, In, Code, Alg, V>} settings
   * @returns {Schema.ReadResult<Schema.LinkOf<Out, Code, Alg, V>>}
   */
  readWith(cid, { codec, hasher, version, schema }) {
    const result = LinkSchema.validate(cid, {
      codec,
      hasher,
      version,
      schema,
    })

    if (result.ok) {
      const link = result.ok
      const ok = link instanceof Link ? link : new Link({ link, codec, schema })
      return { ok }
    } else {
      return result
    }
  }

  /**
   *
   * @param {Schema.LinkOf<Out, Code, Alg, V>} source
   * @param {LinkSettings<Out, In, Code, Alg, V>} settings
   * @returns {Schema.ReadResult<Schema.IntoLink<Out>>}
   */
  writeWith(source, settings) {
    return LinkSchema.validate(source.link(), settings)
  }

  /**
   * @returns {never}
   */
  link() {
    throw new Error('Can not create link of link')
  }

  /**
   * @returns {Schema.AttachmentSchema<Out, Code, Alg, V>}
   */
  attached() {
    let attachment = this._attached
    if (attachment == null) {
      const attachment = new AttachmentSchema(this.settings)
      this._attached = attachment
      return attachment
    }

    return attachment
  }

  /**
   * @param {Out} target
   */
  embed(target) {
    return this.attached().embed(target)
  }
  /**
   * @param {Out} target
   */
  attach(target) {
    return this.attached().attach(target)
  }

  /**
   * @template {string} Prefix
   * @param {string} input
   * @param {Schema.MultibaseDecoder<Prefix>} [base]
   */
  parse(input, base) {
    const link = parseLink(input, base)
    return this.from(/** @type {*} */ (link))
  }
}

/**
 * @template {unknown} Out
 * @template {unknown} In
 * @template {Schema.MulticodecCode} Code
 * @template {Schema.MulticodecCode} Alg
 * @template {Schema.UnknownLink['version']} V
 * @extends {API<Schema.Attachment<Out, Code, Alg, V>, Schema.IPLDView<Out>, LinkSettings<Out, In, Code, Alg, V>>}
 * @implements {Schema.AttachmentSchema<Out, Code, Alg, V>}
 */
class AttachmentSchema extends API {
  /**
   * @param {Schema.IPLDView<Out>} source
   * @param {LinkSettings<Out, In, Code, Alg, V>} settings
   * @param {Schema.Region} [region]
   */
  readWith(source, { codec, schema }, region = emptyStore) {
    const link = /** @type {Schema.Link<Out, Code, Alg, V>} */ (source.link())
    const block = source.root ? source.root : region.get(`${link}`)
    /** @type {Uint8Array|undefined} */
    const bytes = block
      ? block.bytes
      : link.multihash.code === identity.code
      ? link.multihash.digest
      : undefined

    if (bytes) {
      const attachment = new Attachment({
        root: { cid: link, bytes },
        codec,
        schema,
        store: region,
      })
      return { ok: attachment }
    } else {
      return error(`Could not find block for ${link}`)
    }
  }
  /**
   * @param {Schema.Attachment<Out, Code, Alg, V>} attachment
   * @param {LinkSettings<Out, In, Code, Alg, V>} settings
   * @returns {Schema.ReadResult<Schema.IPLDView<Out>>}
   */
  writeWith(attachment, settings) {
    if (attachment instanceof Attachment) {
      return { ok: attachment }
    }

    console.log('!!!!!!!!!')
    try {
      const { codec, schema } = settings
      const link = attachment.link()
      const out = attachment.resolve()
      const data = schema.tryTo(out)
      if (data.error) {
        return data
      } else {
        /** @type {Uint8Array} */
        const bytes = (codec || CBOR).encode(data.ok)
        /** @type {Required<Schema.Block<Out, Code, Alg, V>>} */
        const root = { cid: link, bytes, data: out }
        const view = new Attachment({ root, codec, schema })
        return { ok: view }
      }
    } catch (cause) {
      return { error: /** @type {Error} */ (cause) }
    }
  }

  /**
   * @param {Out} target
   * @param {{hasher?: Schema.MultihashHasher<Alg> }} options
   */
  async attach(target, { hasher = /** @type {*} */ (sha256) } = {}) {
    const { schema, codec = CBOR } = this.settings
    const result = schema.tryTo(target)
    if (result.error) {
      throw result.error
    }
    const data = result.ok
    /** @type {Uint8Array} */
    const bytes = codec.encode(data)
    const digest = await hasher.digest(bytes)
    /** @type {Schema.Link<Out, *, Alg, *>} */
    const cid = createLink(codec.code, digest)

    const store = new Map()
    for (const block of Attachment.iterateIPLDBlocks(target)) {
      store.set(`${block.cid}`, block)
    }
    store.set(`${cid}`, { bytes, cid })

    return new Attachment({
      codec,
      schema,
      root: { bytes, cid },
      store,
    })
  }

  /**
   * @param {Out} target
   */
  embed(target) {
    const { schema, codec = /** @type {*} */ (CBOR) } = this.settings
    const result = schema.tryTo(target)
    if (result.error) {
      throw result.error
    }
    const data = result.ok
    /** @type {Uint8Array} */
    const bytes = codec.encode(data)
    const digest = identity.digest(bytes)
    /** @type {Schema.Link<Out, Code, *>} */
    const cid = createLink(codec.code, digest)

    return new Attachment({
      codec,
      schema,
      root: { bytes, cid },
    })
  }

  /**
   * @returns {never}
   */
  link() {
    throw new Error('Can not create link of link')
  }
}

/**
 * @template {unknown} Out
 * @template In
 * @template {Schema.BlockCodec<Schema.MulticodecCode, In>} Codec
 * @template {Schema.MultihashHasher<Schema.MulticodecCode>} Hasher
 * @template {Schema.UnknownLink['version']} Version
 * @param {LinkSettings<Out, In, Codec['code'], Hasher['code'], Version>} options
 * @returns {Schema.LinkSchema<Out, Codec['code'], Hasher['code'], Version>}
 */
export const link = options => new LinkSchema(options)

/**
 * @template {Schema.VariantChoices} Choices
 * @extends {API<Schema.InferVariant<Choices>, Schema.InferVariantInput<Choices>, Choices>}
 * @implements {Schema.VariantSchema<Choices>}
 */
class Variant extends API {
  /**
   * @param {Schema.InferVariantInput<Choices>} input
   * @param {Choices} variants
   * @param {Schema.Region} [context]
   * @returns {Schema.ReadResult<Schema.InferVariant<Choices>>}
   */
  readWith(input, variants, context) {
    if (typeof input != 'object' || input === null || Array.isArray(input)) {
      return typeError({
        expect: 'object',
        actual: input,
      })
    }

    const keys = /** @type {Array<keyof input & keyof variants & string>} */ (
      Object.keys(input)
    )

    const [key] = keys.length === 1 ? keys : []
    const reader = key ? variants[key] : undefined

    if (reader) {
      const result = reader.tryFrom(input[key], context)
      return result.error
        ? memberError({ at: key, cause: result.error })
        : {
            ok: /** @type {Schema.InferVariant<Choices>} */ ({
              [key]: result.ok,
            }),
          }
    } else if (variants._) {
      const result = variants._.tryFrom(input, context)
      return result.error
        ? result
        : { ok: /** @type {Schema.InferVariant<Choices>} */ ({ _: result.ok }) }
    } else if (key) {
      return error(
        `Expected an object with one of the these keys: ${Object.keys(variants)
          .sort()
          .join(', ')} instead got object with key ${key}`
      )
    } else {
      return error(
        'Expected an object with a single key instead got object with keys ' +
          keys.sort().join(', ')
      )
    }
  }

  /**
   * @template [E=never]
   * @param {unknown} input
   * @param {E} [fallback]
   */
  match(input, fallback) {
    const result = this.tryFrom(/** @type {*} */ (input))
    if (result.error) {
      if (fallback !== undefined) {
        return [null, fallback]
      } else {
        throw result.error
      }
    } else {
      const [key] = Object.keys(result.ok)
      const value = result.ok[key]
      return /** @type {*} */ ([key, value])
    }
  }

  /**
   * @template {Schema.InferVariant<Choices>} Choice
   * @param {Choice} source
   * @returns {Choice}
   */
  create(source) {
    return /** @type {Choice} */ (this.from(/** @type {*} */ (source)))
  }
}

/**
 * Defines a schema for the `Variant` type. It takes an object where
 * keys denote branches of the variant and values are schemas for the values of
 * those branches. The schema will only match objects with a single key and
 * value that matches the schema for that key. If the object has more than one
 * key or the key does not match any of the keys in the schema then the schema
 * will fail.
 *
 * The `_` branch is a special case. If such branch is present then it will be
 * used as a fallback for any object that does not match any of the variant
 * branches. The `_` branch will be used even if the object has more than one
 * key. Unlike other branches the `_` branch will receive the entire object as
 * input and not just the value of the key. Usually the `_` branch can be set
 * to `Schema.unknown` or `Schema.dictionary` to facilitate exhaustive matching.
 *
 * @example
 * ```ts
 * const Shape = Variant({
 *    circle: Schema.struct({ radius: Schema.integer() }),
 *    rectangle: Schema.struct({ width: Schema.integer(), height: Schema.integer() })
 * })
 *
 * const demo = (input:unknown) => {
 *   const [kind, value] = Schema.match(input)
 *   switch (kind) {
 *     case "circle":
 *       return `Circle with radius ${shape.radius}`
 *     case "rectangle":
 *       return `Rectangle with width ${shape.width} and height ${shape.height}`
 *    }
 * }
 *
 * const ExhaustiveShape = Variant({
 *   circle: Schema.struct({ radius: Schema.integer() }),
 *   rectangle: Schema.struct({ width: Schema.integer(), height: Schema.integer() }),
 *  _: Schema.dictionary({ value: Schema.unknown() })
 * })
 *
 * const exhastiveDemo = (input:unknown) => {
 *   const [kind, value] = Schema.match(input)
 *   switch (kind) {
 *     case "circle":
 *       return `Circle with radius ${shape.radius}`
 *     case "rectangle":
 *       return `Rectangle with width ${shape.width} and height ${shape.height}`
 *     case: "_":
 *       return `Unknown shape ${JSON.stringify(value)}`
 *    }
 * }
 * ```
 *
 * @template {Schema.VariantChoices} Choices
 * @param {Choices} variants
 * @returns {Schema.VariantSchema<Choices>}
 */
export const variant = variants => new Variant(variants)

/**
 * @param {string} message
 * @returns {{error: Schema.Error, ok?: undefined}}
 */
export const error = message => ({ error: new SchemaError(message) })

class SchemaError extends Failure {
  get name() {
    return 'SchemaError'
  }
  /* c8 ignore next 3 */
  describe() {
    return this.name
  }
}

class TypeError extends SchemaError {
  /**
   * @param {{expect:string, actual:unknown}} data
   */
  constructor({ expect, actual }) {
    super()
    this.expect = expect
    this.actual = actual
  }
  get name() {
    return 'TypeError'
  }
  describe() {
    return `Expected value of type ${this.expect} instead got ${displayTypeName(
      this.actual
    )}`
  }
}

/**
 * @param {object} data
 * @param {string} data.expect
 * @param {unknown} data.actual
 * @returns {{ error: Schema.Error }}
 */
export const typeError = data => ({ error: new TypeError(data) })

/**
 *
 * @param {unknown} value
 */
const displayTypeName = value => {
  const type = typeof value
  switch (type) {
    case 'boolean':
    case 'string':
      return JSON.stringify(value)
    // if these types we do not want JSON.stringify as it may mess things up
    // eg turn NaN and Infinity to null
    case 'bigint':
      return `${value}n`
    case 'symbol':
      return /** @type {symbol} */ (value).toString()
    case 'number':
    case 'undefined':
      return `${value}`
    case 'object':
      return value === null
        ? 'null'
        : Array.isArray(value)
        ? 'array'
        : Symbol.toStringTag in /** @type {object} */ (value)
        ? value[Symbol.toStringTag]
        : 'object'
    default:
      return type
  }
}

class LiteralError extends SchemaError {
  /**
   * @param {{
   * expect:string|number|boolean|null
   * actual:unknown
   * }} data
   */
  constructor({ expect, actual }) {
    super()
    this.expect = expect
    this.actual = actual
  }
  get name() {
    return 'LiteralError'
  }
  describe() {
    return `Expected literal ${displayTypeName(
      this.expect
    )} instead got ${displayTypeName(this.actual)}`
  }
}

class ElementError extends SchemaError {
  /**
   * @param {{at:number, cause:Schema.Error}} data
   */
  constructor({ at, cause }) {
    super()
    this.at = at
    this.cause = cause
  }
  get name() {
    return 'ElementError'
  }
  describe() {
    return [
      `Array contains invalid element at ${this.at}:`,
      li(this.cause.message),
    ].join('\n')
  }
}

class FieldError extends SchemaError {
  /**
   * @param {{at:string, cause:Schema.Error}} data
   */
  constructor({ at, cause }) {
    super()
    this.at = at
    this.cause = cause
  }
  get name() {
    return 'FieldError'
  }
  describe() {
    return [
      `Object contains invalid field "${this.at}":`,
      li(this.cause.message),
    ].join('\n')
  }
}

/**
 * @param {object} options
 * @param {string|number} options.at
 * @param {Schema.Error} options.cause
 * @returns {{error: Schema.Error}}
 */
export const memberError = ({ at, cause }) =>
  typeof at === 'string'
    ? { error: new FieldError({ at, cause }) }
    : { error: new ElementError({ at, cause }) }

class UnionError extends SchemaError {
  /**
   * @param {{causes: Schema.Error[]}} data
   */
  constructor({ causes }) {
    super()
    this.causes = causes
  }
  get name() {
    return 'UnionError'
  }
  describe() {
    const { causes } = this
    return [
      `Value does not match any type of the union:`,
      ...causes.map(cause => li(cause.message)),
    ].join('\n')
  }
}

class IntersectionError extends SchemaError {
  /**
   * @param {{causes: Schema.Error[]}} data
   */
  constructor({ causes }) {
    super()
    this.causes = causes
  }
  get name() {
    return 'IntersectionError'
  }
  describe() {
    const { causes } = this
    return [
      `Value does not match following types of the intersection:`,
      ...causes.map(cause => li(cause.message)),
    ].join('\n')
  }
}

/**
 * @param {string} message
 */
const indent = (message, indent = '  ') =>
  `${indent}${message.split('\n').join(`\n${indent}`)}`

/**
 * @param {string} message
 */
const li = message => indent(`- ${message}`)

/**
 * @template In, Out
 * @param {Schema.Schema<Out, In>} schema
 * @returns {{in:In, out:Out}}
 */
export const debug = schema => {
  throw new Error('Not implemented')
}

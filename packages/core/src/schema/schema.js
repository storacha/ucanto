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
import * as CBOR from '../cbor.js'
import { sha256 } from 'multiformats/hashes/sha2'

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

    // this.codec = CBOR
    // this.hasher = sha256
  }

  toString() {
    return `new ${this.constructor.name}()`
  }
  /**
   * @abstract
   * @param {In} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<Out>}
   */
  /* c8 ignore next 3 */
  readWith(input, settings) {
    throw new Error(`Abstract method readWith must be implemented by subclass`)
  }

  /**
   *
   * @param {Out} output
   * @param {Settings} settings
   * @returns {Schema.ReadResult<In>}
   */
  writeWith(output, settings) {
    throw new Error(`Abstract method readWith must be implemented by subclass`)
  }

  /**
   * @param {In} input
   * @returns {Schema.ReadResult<Out>}
   */
  read(input) {
    return this.readWith(input, this.settings)
  }

  /**
   * @param {Out} output
   * @returns {Schema.ReadResult<In>}
   */
  write(output) {
    return this.writeWith(output, this.settings)
  }

  /**
   * @param {unknown} value
   * @returns {value is Out}
   */
  is(value) {
    return !this.read(/** @type {In} */ (value))?.error
  }

  /**
   * @param {In} value
   * @return {Out}
   */
  from(value) {
    const result = this.read(/** @type {In} */ (value))
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
    const result = this.write(value)
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
   * @returns {Schema.ArraySchema<Out, In>}
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
   * @param {Schema.Reader<O, Out>} schema
   * @returns {Schema.Schema<O, In>}
   */
  refine(schema) {
    return refine(this, schema)
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
   * @template {number} [Code=number]
   * @template {number} [Alg=number]
   * @template {1|0} [Version=0|1]
   * @param {{
   * codec?: Schema.BlockCodec<Code, unknown>
   * hasher?: Schema.MultihashHasher<Alg>
   * version?: Version
   * }} options
   * @returns {Schema.LinkSchema<Out, Schema.Link<Out, Code, Alg, Version> | Schema.IPLDView<Out>, Code, Alg, Version>}
   */
  link({ codec, hasher, version } = {}) {
    const schema = link({
      ...(codec ? { code: codec.code } : {}),
      ...(hasher ? { multihash: { code: hasher.code } } : {}),
      ...(version ? { version } : {}),
      schema: /** @type {Schema.Schema<Out, unknown>} */ (this),
    })

    return schema
  }

  // /**
  //  * @param {In} input
  //  * @returns {Schema.Result<Schema.IPLDViewBuilder<Schema.IPLDView<Out>>, Schema.Error>}
  //  */
  // toIPLDBuilder(input) {
  //   const result = this.read(input)
  //   if (result.error) {
  //     return result
  //   } else {
  //     const data = result.ok
  //     const builder = new IPLDViewBuilder({
  //       data,
  //       schema: this,
  //     })
  //     return { ok: builder }
  //   }
  // }

  // /**
  //  * @param {object} source
  //  * @param {Schema.Link} source.link
  //  * @param {Schema.BlockStore} source.store
  //  * @returns {ReturnType<this['createIPLDView']>}
  //  */
  // toIPLDView({ link, store }) {
  //   const block = store.get(`${link}`)
  //   if (!block) {
  //     return /** @type {*} */ ({ error: new Error(`Missing block ${link}`) })
  //   } else {
  //     return /** @type {*} */ (this.createIPLDView({ root: block, store }))
  //   }
  // }

  // /**
  //  * @param {object} source
  //  * @param {Schema.Block<unknown>} source.root
  //  * @param {Schema.BlockStore} source.store
  //  * @returns {Schema.Result<Schema.IPLDView<Out>, Schema.Error>}
  //  */
  // createIPLDView({ root, store }) {
  //   const input = /** @type {In} */ (this.codec.decode(root.bytes))
  //   const result = this.read(input)
  //   if (result.error) {
  //     return result
  //   } else {
  //     const view = new IPLDView({
  //       root: { ...root, data: result.ok },
  //       store,
  //       schema: this,
  //     })
  //     return { ok: view }
  //   }
  // }
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
  to(value) {
    return value
  }
  /**
   * @param {any} input
   * @returns {Schema.ReadResult<never>}
   */
  read(input) {
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
  read(input) {
    return /** @type {Schema.ReadResult<unknown>}*/ ({ ok: input })
  }
  /**
   * @param {unknown} output
   */
  write(output) {
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

// /**
//  * @template {unknown} T
//  * @implements {Schema.IPLDViewBuilder<Schema.IPLDView<T>>}
//  */
// class IPLDViewBuilder {
//   /**
//    * @param {object} input
//    * @param {T} input.data
//    * @param {Schema.Schema<T>} input.schema
//    */
//   constructor({ data, schema }) {
//     this.data = data
//     this.schema = schema
//   }

//   /**
//    * @param {Schema.BuildOptions} [options]
//    * @returns {Promise<Schema.IPLDView<T>>}
//    */
//   async buildIPLDView({
//     encoder = this.schema.codec,
//     hasher = this.schema.hasher,
//   } = {}) {
//     const { data } = this
//     const bytes = encoder.encode(data)
//     const digest = await hasher.digest(bytes)
//     /** @type {Schema.Link<T>} */
//     const cid = createLink(encoder.code, digest)
//     return new IPLDView({ root: { bytes, data, cid }, schema: this.schema })
//   }
// }

// /**
//  * @template {unknown} T
//  * @implements {Schema.IPLDView<T>}
//  * @implements {Schema.IPLDViewBuilder<Schema.IPLDView<T>>}
//  */
// class IPLDView {
//   /**
//    * @param {object} input
//    * @param {Required<Schema.Block>} input.root
//    * @param {Schema.Schema<T>} input.schema
//    * @param {Schema.BlockStore} [input.store]
//    */
//   constructor({ root, store = new Map(), schema }) {
//     this.root = root
//     this.store = store
//     this.schema = schema
//   }

//   /**
//    * @template T
//    * @param {object} input
//    * @param {Required<Schema.Block>} input.root
//    * @param {Schema.Schema<T>} input.schema
//    * @param {Schema.BlockStore} [input.store]
//    */
//   static create(input) {
//     return new this(input)
//   }

//   /**
//    * @returns {Schema.Link<T>}
//    */
//   link() {
//     return this.root.cid
//   }
//   /**
//    * @returns {IterableIterator<Schema.Block>}
//    */
//   *iterateIPLDBlocks() {
//     yield this.root
//   }

//   /**
//    * @returns {Schema.IPLDView<T>}
//    */
//   buildIPLDView() {
//     return this
//   }
// }

/**
 * @template I, O
 * @extends {API<null|O, null|I, Schema.Convert<O, I>>}
 * @implements {Schema.Schema<null|O, I|null>}
 */
class Nullable extends API {
  /**
   * @param {I|null} input
   * @param {Schema.Reader<O, I>} reader
   */
  readWith(input, reader) {
    if (input === null) {
      return { ok: null }
    }

    const result = reader.read(input)
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
   * @param {Schema.Writer<O, I>} writer
   */
  writeWith(output, writer) {
    return output === null ? { ok: null } : writer.write(output)
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
 * @template [I=unknown]
 * @extends {API<O|undefined, I, Schema.Convert<O, I>>}
 * @implements {Schema.Schema<O|undefined, I|undefined>}
 */
class Optional extends API {
  optional() {
    return this
  }
  /**
   * @param {I|undefined} input
   * @param {Schema.Reader<O, I>} reader
   * @returns {Schema.ReadResult<O|undefined>}
   */
  readWith(input, reader) {
    if (input === undefined) {
      return { ok: undefined }
    }
    const result = reader.read(input)
    return result.error && input === undefined ? { ok: undefined } : result
  }
  /**
   *
   * @param {O|undefined} output
   * @param {Schema.Convert} writer
   */
  writeWith(output, writer) {
    return output === undefined ? { ok: undefined } : writer.write(output)
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
   * @returns {Schema.ImplicitSchema<Out, In>}
   */
  optional() {
    return this
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
   * @returns {Schema.ReadResult<Exclude<Out, undefined>>}
   */
  readWith(input, { convert, value }) {
    if (input === undefined) {
      return { ok: value }
    } else {
      const result = convert.read(input)

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
    return convert.write(output)
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

  const implicit =
    /** @type {Schema.ImplicitSchema<O & Schema.NotUndefined<O>, I>} */ (
      new Implicit({ convert: schema, value })
    )

  return implicit
}

/**
 * @template O
 * @template I
 * @extends {API<O[], I[], Schema.Convert<O, I>>}
 * @implements {Schema.ArraySchema<O, I>}
 */
class ArrayOf extends API {
  /**
   * @param {I[]} input
   * @param {Schema.Reader<O, I>} schema
   */
  readWith(input, schema) {
    if (!Array.isArray(input)) {
      return typeError({ expect: 'array', actual: input })
    }
    /** @type {O[]} */
    const results = []
    for (const [index, value] of input.entries()) {
      const result = schema.read(value)
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
   * @param {O[]} output
   * @param {Schema.Writer<O, I>} schema
   */
  writeWith(output, schema) {
    /** @type {I[]} */
    const results = []
    for (const [index, value] of output.entries()) {
      const result = schema.write(value)
      if (result.error) {
        return memberError({ at: index, cause: result.error })
      } else {
        results.push(result.ok)
      }
    }
    return { ok: results }
  }
  /**
   * @type {Schema.Convert<O, I>}
   */
  get element() {
    return this.settings
  }
  toString() {
    return `array(${this.element})`
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.Convert<O, I>} schema
 * @returns {Schema.ArraySchema<O, I>}
 */
export const array = schema => new ArrayOf(schema)

/**
 * @template {[Schema.Convert, ...Schema.Convert[]]} Shape
 * @extends {API<Schema.InferTuple<Shape>, Schema.InferTupleInput<Shape>, Shape>}
 * @implements {Schema.Schema<Schema.InferTuple<Shape>, Schema.InferTupleInput<Shape>>}
 */
class Tuple extends API {
  /**
   * @param {Schema.InferTupleInput<Shape>} input
   * @param {Shape} shape
   * @returns {Schema.ReadResult<Schema.InferTuple<Shape>>}
   */
  readWith(input, shape) {
    if (!Array.isArray(input)) {
      return typeError({ expect: 'array', actual: input })
    }
    if (input.length !== this.shape.length) {
      return error(`Array must contain exactly ${this.shape.length} elements`)
    }

    const results = []
    for (const [index, reader] of shape.entries()) {
      const result = reader.read(input[index])
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
      const result = writer.write(output[index])
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
 * @extends {API<Schema.Dictionary<K, V>, Schema.Dictionary<K, U>, { key: Schema.Reader<K, string>, value: Schema.Convert<V, U> }>}
 * @implements {Schema.DictionarySchema<V, K, U>}
 */
class Dictionary extends API {
  /**
   * @param {Schema.Dictionary<K, U>} input
   * @param {object} schema
   * @param {Schema.Reader<K, string>} schema.key
   * @param {Schema.Reader<V, U>} schema.value
   */
  readWith(input, { key, value }) {
    if (typeof input != 'object' || input === null || Array.isArray(input)) {
      return typeError({
        expect: 'dictionary',
        actual: input,
      })
    }

    const dict = /** @type {Schema.Dictionary<K, V>} */ ({})

    for (const [k, v] of Object.entries(input)) {
      const keyResult = key.read(k)
      if (keyResult.error) {
        return memberError({ at: k, cause: keyResult.error })
      }

      const valueResult = value.read(v)
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
   * @param {Schema.Reader<K, string>} schema.key
   * @param {Schema.Writer<V, U>} schema.value
   */
  writeWith(output, { key, value }) {
    const dict = /** @type {Schema.Dictionary<K, U>} */ ({})

    for (const [k, v] of Object.entries(output)) {
      const keyResult = key.read(k)
      if (keyResult.error) {
        return memberError({ at: k, cause: keyResult.error })
      }

      const valueResult = value.write(/** @type {V} */ (v))
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

  /**
   *
   * @returns {Schema.DictionarySchema<V|undefined, K, U|undefined>}
   */
  partial() {
    const { key, value } = this.settings
    const partial = new Dictionary({
      key,
      value: optional(value),
    })
    return partial
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
 * @param {Schema.Reader<K, string>} [shape.key]
 * @returns {Schema.DictionarySchema<V, K, U>}
 */
export const dictionary = ({ value, key }) =>
  new Dictionary({
    value,
    key: key || /** @type {Schema.Reader<K, string>} */ (string()),
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
   */
  readWith(input, variants) {
    const causes = []
    for (const reader of variants) {
      const result = reader.read(input)
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
      const result = member.write(output)
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
   * @returns {Schema.ReadResult<Schema.InferIntersection<Members>>}
   */
  readWith(input, schemas) {
    const causes = []
    for (const schema of schemas) {
      const result = schema.read(input)
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
      const result = member.write(output)
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
 * @template {number} O
 * @template {number} I
 * @template [Settings=void]
 * @extends {API<O, I, Settings>}
 * @implements {Schema.NumberSchema<O, I>}
 */
class NumberSchema extends API {
  isInteger = globalThis.Number.isInteger
  isFinite = globalThis.Number.isFinite

  /**
   * @param {(input: O) => Schema.ReadResult<O>} check
   * @returns {Schema.NumberSchema<O, I>}
   */
  constraint(check) {
    return this.refine({
      read: check,
      write: check,
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
   * @template {O} Into
   * @param {Schema.Convert<Into, O>} convert
   * @returns {Schema.NumberSchema<Into, I>}
   */
  refine(convert) {
    return new RefinedNumber({ schema: this, refine: convert })
  }

  /**
   * @param {I} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<O>}
   */
  readWith(input, settings) {
    return typeof input === 'number'
      ? { ok: /** @type {*} */ (input) }
      : typeError({ expect: 'number', actual: input })
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
 * @template {Out} Into
 * @extends {NumberSchema<Into, In, {schema: Schema.Convert<Out, In>, refine:Schema.Reader<Into, Out>}>}
 * @implements {Schema.NumberSchema<Into, In>}
 */
class RefinedNumber extends NumberSchema {
  /**
   * @param {In} input
   * @param {{schema: Schema.Convert<Out, In>, refine: Schema.Convert<Into, Out> } } settings
   * @returns {Schema.ReadResult<Into>}
   */
  readWith(input, { schema, refine }) {
    const result = schema.read(input)
    return result.error ? result : refine.read(result.ok)
  }

  /**
   * @param {Into} output
   * @param {{schema: Schema.Convert<Out, In>, refine: Schema.Convert<Into, Out> } } settings
   */
  writeWith(output, { schema, refine }) {
    const result = refine.write(output)
    return result.error ? result : schema.write(result.ok)
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
   * @param {number} input
   * @returns {Schema.ReadResult<Schema.Integer>}
   */
  read(input) {
    return Number.isInteger(input)
      ? { ok: /** @type {Schema.Integer} */ (input) }
      : typeError({
          expect: 'integer',
          actual: input,
        })
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
  read(number) {
    return Number.isFinite(number)
      ? { ok: /** @type {Schema.Float} */ (number) }
      : typeError({
          expect: 'Float',
          actual: number,
        })
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
   * @param {In} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<Out>}
   */
  readWith(input, settings) {
    return typeof input === 'string'
      ? { ok: /** @type {Out & In} */ (input) }
      : typeError({ expect: 'string', actual: input })
  }

  /**
   * @template {Out} Onto
   * @param {Schema.Convert<Onto, Out>} schema
   * @returns {Schema.StringSchema<Onto & Out, In>}
   */
  refine(schema) {
    const refined = new RefinedString({
      base: this,
      schema,
    })

    return /** @type {Schema.StringSchema<Onto, In>} */ (refined)
  }

  /**
   * @param {(value: Out) => Schema.ReadResult<Out>} check
   * @returns {Schema.StringSchema<Out, In>}
   */
  constraint(check) {
    return this.refine({
      read: check,
      write: check,
    })
  }
  /**
   * @template {string} Prefix
   * @param {Prefix} prefix
   */
  startsWith(prefix) {
    return this.refine(startsWith(prefix))
  }
  /**
   * @template {string} Suffix
   * @param {Suffix} suffix
   */
  endsWith(suffix) {
    return this.refine(endsWith(suffix))
  }
  toString() {
    return `string()`
  }
}

/**
 * @template {string} Into
 * @template {string} Out
 * @template {string} In
 * @extends {StringSchema<Into & Out, In, {base:Schema.Convert<Out, In>, schema:Schema.Reader<Into, Out>}>}
 * @implements {Schema.StringSchema<Into & Out, In>}
 */
class RefinedString extends StringSchema {
  /**
   * @param {In} input
   * @param {{base:Schema.Reader<Out, In>, schema:Schema.Reader<Into, Out>}} settings
   * @returns {Schema.ReadResult<Out & Into>}
   */
  readWith(input, { base, schema }) {
    const result = base.read(input)
    return result.error
      ? result
      : /** @type {Schema.ReadResult<Out & Into>} */ (schema.read(result.ok))
  }

  /**
   * @param {Into & Out} output
   * @param {{base:Schema.Writer<Out, In>, schema:Schema.Reader<Into, Out>}} settings
   * @returns {Schema.ReadResult<In>}
   */
  writeWith(output, { base, schema }) {
    return base.write(output)
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
 * @returns {Schema.Schema<`${Prefix}${string}` & Input, Input>}
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
 * @template {Out} Into
 * @template In
 * @extends {API<Into & Out, In, { base: Schema.Reader<Out, In>, schema: Schema.Reader<Into, Out> }>}
 * @implements {Schema.Schema<Into & Out, In>}
 */

class Refine extends API {
  /**
   * @param {In} input
   * @param {{ base: Schema.Convert<Out, In>, schema: Schema.Reader<Into, Out> }} settings
   */
  readWith(input, { base, schema }) {
    const result = base.read(input)
    return result.error ? result : schema.read(result.ok)
  }
  /**
   * @param {Into & Out} output
   * @param {{ base: Schema.Convert<Out, In>, schema: Schema.Reader<Into, Out> }} settings
   */
  writeWith(output, { base, schema }) {
    return base.write(output)
  }
  toString() {
    return `${this.settings.base}.refine(${this.settings.schema})`
  }
}

/**
 * @template Out
 * @template {Out} Into
 * @template In
 * @param {Schema.Convert<Out, In>} base
 * @param {Schema.Reader<Into, Out>} schema
 * @returns {Schema.Schema<Into, In>}
 */
export const refine = (base, schema) => new Refine({ base, schema })

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
   * @returns {Schema.ReadResult<Schema.InferStruct<Members>>}
   */
  readWith(input, { shape }) {
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
      const result = reader.read(source[at])
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

  // /**
  //  * @param {object} source
  //  * @param {Schema.Block} source.root
  //  * @param {Schema.BlockStore} source.store
  //  * @returns {Schema.Result<Schema.InferStruct<Members> & Schema.IPLDView<Schema.InferStruct<Members>>, Schema.Error>}
  //  */
  // createIPLDView(source) {
  //   const data = this.codec.decode(source.root.bytes)

  //   if (typeof data != 'object' || data === null || Array.isArray(data)) {
  //     return typeError({
  //       expect: 'object',
  //       actual: data,
  //     })
  //   }

  //   let View = this._View || (this._View = IPLDStructView.struct(this.shape))
  //   const root = { ...source.root, data }

  //   const view = View.create({ root, store: source.store, schema: this })
  //   return { ok: view }
  // }
}

// /**
//  * @template {{[key:string]: Schema.Reader}} U
//  * @extends {IPLDView<Schema.InferStruct<U>>}
//  */
// class IPLDStructView extends IPLDView {
//   /**
//    * @template {{[key:string]: Schema.Reader}} U
//    * @param {U} shape
//    * @returns {Schema.CreateView<Schema.InferStruct<U>, Schema.InferStruct<U>>}
//    */
//   static struct(shape) {
//     /** @extends {IPLDStructView<U>} */
//     class View extends this {
//       static shape = shape
//     }

//     for (const [key, schema] of Object.entries(shape)) {
//       Object.defineProperty(View.prototype, key, {
//         get() {
//           let result = this[`_${key}`]
//           if (!result) {
//             result = schema.read(this.root.data[key])
//             this[`_${key}`] = result
//           }

//           if (result.ok) {
//             return result.ok
//           } else {
//             throw memberError({ at: key, cause: result.error }).error
//           }
//         },
//       })
//     }

//     return /** @type {*} */ (View)
//   }
// }

/**
 * @template {null|boolean|string|number} T
 * @template {{[key:string]: T|Schema.Convert}} U
 * @template {{[K in keyof U]: U[K] extends Schema.Convert ? U[K] : Schema.Convert<U[K] & T>}} Members
 * @template [I=unknown]
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

  return new Struct({ shape: /** @type {Members} */ (shape) })
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
}

/** @type {Schema.BytesSchema} */
export const Bytes = new RawBytes()

/**
 * @template {Schema.BlockCodec<number, any>} [Codec=import('multiformats/codecs/raw')]
 * @param {Codec} [codec]
 * @returns {Schema.BytesSchema<ReturnType<Codec['decode']> & ({} | null), Schema.MulticodecCode<Codec['code'], Codec['name']>>}
 */
export const bytes = codec =>
  /** @type {*} */ (codec ? new ByteView(codec) : Bytes)

/**
 * @template {{}|null} Out
 * @template {Schema.MulticodecCode} Code
 * @extends {API<Out, Schema.ByteView<Out>, Schema.BlockCodec<Code, Out>>}
 * @implements {Schema.BytesSchema<Out, Code>}
 */
class ByteView extends API {
  get codec() {
    return this.settings
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
    return this.codec.encode(data)
  }
  /**
   * @param {Schema.ByteView<Out>} bytes
   */
  decode(bytes) {
    return this.codec.decode(bytes)
  }
  /**
   * @param {Uint8Array} input
   * @param {Schema.BlockCodec<Code, Out>} codec
   * @returns {Schema.ReadResult<Out>}
   */
  readWith(input, codec) {
    try {
      return { ok: codec.decode(input) }
    } catch (cause) {
      return { error: /** @type {Error} */ (cause) }
    }
  }
  /**
   *
   * @param {Out} output
   * @param {Schema.BlockCodec<Code, Out>} codec
   */
  writeWith(output, codec) {
    try {
      return { ok: codec.encode(output) }
    } catch (cause) {
      return { error: /** @type {Error} */ (cause) }
    }
  }
}

/**
 * @template {unknown} [T=unknown]
 * @template {number} [Code=number]
 * @template {number} [Alg=number]
 * @template {1|0} [Version=0|1]
 * @typedef {{
 * code?:Code,
 * version?:Version
 * multihash?: {code?: Alg, digest?: Uint8Array}
 * schema?: Schema.Schema<T, unknown>
 * }} LinkSettings
 */

/**
 * @template {unknown} Out
 * @template {unknown} In
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @extends {API<Schema.Link<Out, Code, Alg, Version>, In, LinkSettings<Out, Code, Alg, Version>>}
 * @implements {Schema.LinkSchema<Out, In, Code, Alg, Version>}
 */
class LinkSchema extends API {
  /**
   *
   * @param {unknown} cid
   * @param {LinkSettings<Out, Code, Alg, Version>} settings
   * @returns {Schema.ReadResult<Schema.Link<Out, Code, Alg, Version>>}
   */
  readWith(cid, { code, multihash = {}, version }) {
    if (cid == null) {
      return error(`Expected link but got ${cid} instead`)
    } else {
      if (!isLink(cid)) {
        return error(`Expected link to be a CID instead of ${cid}`)
      } else {
        if (code != null && cid.code !== code) {
          return error(
            `Expected link to be CID with 0x${code.toString(16)} codec`
          )
        }

        if (multihash.code != null && cid.multihash.code !== multihash.code)
          return error(
            `Expected link to be CID with 0x${multihash.code.toString(
              16
            )} hashing algorithm`
          )

        if (version != null && cid.version !== version) {
          return error(
            `Expected link to be CID version ${version} instead of ${cid.version}`
          )
        }

        const [expectDigest, actualDigest] =
          multihash.digest != null
            ? [
                base32.baseEncode(multihash.digest),
                base32.baseEncode(cid.multihash.digest),
              ]
            : ['', '']

        if (expectDigest !== actualDigest) {
          return error(
            `Expected link with "${expectDigest}" hash digest instead of "${actualDigest}"`
          )
        }

        return {
          ok: /** @type {Schema.Link<Out, any, any, any>} */ (cid),
        }
      }
    }
  }

  /**
   * @returns {never}
   */
  link() {
    throw new Error('Can not create link of link')
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

/** @type {Schema.LinkSchema<unknown, Schema.Link<unknown, number, number, 0|1>, number, number, 0|1>}  */
export const Link = new LinkSchema({})

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @template {unknown} Out
 * @param {LinkSettings<Out, Code, Alg, Version>} options
 * @returns {Schema.LinkSchema<Out, Schema.Link<Out, Code, Alg, Version> | Schema.IPLDView<Out>, Code, Alg, Version>}
 */
export const link = (options = {}) => new LinkSchema(options)

/**
 * @template {Schema.VariantChoices} Choices
 * @extends {API<Schema.InferVariant<Choices>, Schema.InferVariantInput<Choices>, Choices>}
 * @implements {Schema.VariantSchema<Choices>}
 */
class Variant extends API {
  /**
   * @param {Schema.InferVariantInput<Choices>} input
   * @param {Choices} variants
   * @returns {Schema.ReadResult<Schema.InferVariant<Choices>>}
   */
  readWith(input, variants) {
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
      const result = reader.read(input[key])
      return result.error
        ? memberError({ at: key, cause: result.error })
        : {
            ok: /** @type {Schema.InferVariant<Choices>} */ ({
              [key]: result.ok,
            }),
          }
    } else if (variants._) {
      const result = variants._.read(input)
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
    const result = this.read(/** @type {*} */ (input))
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
 * @returns {{error: Schema.Error}}
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
      return value === null ? 'null' : Array.isArray(value) ? 'array' : 'object'
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

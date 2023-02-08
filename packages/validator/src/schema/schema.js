import * as Schema from './type.js'

export * from './type.js'

const defaultGroup = {
  /**
   *
   * @param {unknown} group
   * @param {unknown} member
   * @returns {boolean}
   */
  includes(group, member) {
    return group == member
  },
}
/**
 * @abstract
 * @template [T=unknown]
 * @template [I=unknown]
 * @template [Settings=void]
 * @extends {Schema.Base<T, I, Settings>}
 * @implements {Schema.Schema<T, I>}
 */
export class API {
  /**
   * @param {Settings} settings
   * @param {Schema.Group<T, T>} group
   */
  constructor(settings, group = defaultGroup) {
    /** @protected */
    this.settings = settings
  }

  toString() {
    return `new ${this.constructor.name}()`
  }
  /**
   * @abstract
   * @param {I} input
   * @param {Settings} settings
   * @returns {Schema.ReadResult<T>}
   */
  /* c8 ignore next 3 */
  readWith(input, settings) {
    throw new Error(`Abstract method readWith must be implemented by subclass`)
  }

  /**
   * @param {I} input
   * @returns {Schema.ReadResult<T>}
   */
  read(input) {
    return this.readWith(input, this.settings)
  }

  /**
   * @param {T} self
   * @param {T} other
   */
  includes(self, other) {
    return this.includesWith(self, other, this.settings)
  }

  /**
   * @param {T} self
   * @param {T} other
   * @param {Settings} _settings
   */
  includesWith(self, other, _settings) {
    return self === other
  }

  /**
   * @param {unknown} value
   * @returns {value is T}
   */
  is(value) {
    return !this.read(/** @type {I} */ (value))?.error
  }

  /**
   * @param {unknown} value
   * @return {T}
   */
  from(value) {
    const result = this.read(/** @type {I} */ (value))
    if (result?.error) {
      throw result
    } else {
      return result
    }
  }

  /**
   * @returns {Schema.Schema<T|undefined, I>}
   */
  optional() {
    return optional(this)
  }

  /**
   * @returns {Schema.Schema<T|null, I>}
   */
  nullable() {
    return nullable(this)
  }

  /**
   * @returns {Schema.Schema<T[], I>}
   */
  array() {
    return array(this)
  }
  /**
   * @template U
   * @param {Schema.GroupReader<U, I>} schema
   * @returns {Schema.Schema<T | U, I>}
   */

  or(schema) {
    return or(this, schema)
  }

  /**
   * @template U
   * @param {Schema.GroupReader<U, I>} schema
   * @returns {Schema.Schema<T & U, I>}
   */
  and(schema) {
    return and(this, schema)
  }

  /**
   * @template {T} U
   * @param {Schema.Reader<U, T>} schema
   * @returns {Schema.Schema<U, I>}
   */
  refine(schema) {
    return refine(this, schema)
  }

  /**
   * @param {Schema.Group<T, T>} group
   * @returns {Schema.Schema<T, I>}
   */
  with(group) {
    return /** @type {Schema.Schema<T, I>} */ (
      new SchemaWithGroup({
        base: this,
        group,
      })
    )
  }

  /**
   * @template {string} Kind
   * @param {Kind} [kind]
   * @returns {Schema.Schema<Schema.Branded<T, Kind>, I>}
   */
  brand(kind) {
    return /** @type {Schema.Schema<Schema.Branded<T, Kind>, I>} */ (this)
  }

  /**
   * @param {Schema.NotUndefined<T>} value
   * @returns {Schema.DefaultSchema<Schema.NotUndefined<T>, I>}
   */
  default(value) {
    // ⚠️ this.from will throw if wrong default is provided
    const fallback = this.from(value)
    // we also check that fallback is not undefined because that is the point
    // of having a fallback
    if (fallback === undefined) {
      throw new Error(`Value of type undefined is not a vaild default`)
    }

    const schema = new Default({
      reader: /** @type {Schema.GroupReader<T, I>} */ (this),
      value: /** @type {Schema.NotUndefined<T>} */ (fallback),
    })

    return /** @type {Schema.DefaultSchema<Schema.NotUndefined<T>, I>} */ (
      schema
    )
  }
}

/**
 * @template [I=unknown]
 * @extends {API<never, I>}
 * @implements {Schema.Schema<never, I>}
 */
class Never extends API {
  toString() {
    return 'never()'
  }
  /**
   * @param {I} input
   * @returns {Schema.ReadResult<never>}
   */
  read(input) {
    return typeError({ expect: 'never', actual: input })
  }

  includes() {
    // never is included in any other group
    return true
  }
  with() {
    return this
  }
}

/**
 * @template [I=unknown]
 * @returns {Schema.Schema<never, I>}
 */
export const never = () => new Never()

/**
 * @template [I=unknown]
 * @extends API<unknown, I, void>
 * @implements {Schema.Schema<unknown, I>}
 */
class Unknown extends API {
  /**
   * @param {I} input
   */
  read(input) {
    return /** @type {Schema.ReadResult<unknown>}*/ (input)
  }
  toString() {
    return 'unknown()'
  }
}

/**
 * @template [I=unknown]
 * @returns {Schema.Schema<unknown, I>}
 */
export const unknown = () => new Unknown()

/**
 * @template O
 * @template [I=unknown]
 * @extends {API<null|O, I, Schema.GroupReader<O, I>>}
 * @implements {Schema.Schema<null|O, I>}
 */
class Nullable extends API {
  /**
   * @param {I} input
   * @param {Schema.Reader<O, I>} reader
   */
  readWith(input, reader) {
    const result = reader.read(input)
    if (result?.error) {
      return input === null
        ? null
        : new UnionError({
            causes: [result, typeError({ expect: 'null', actual: input })],
          })
    } else {
      return result
    }
  }
  toString() {
    return `${this.settings}.nullable()`
  }

  /**
   *
   * @param {null|O} self
   * @param {null|O} other
   * @param {Schema.Group<O>} group
   */
  includesWith(self, other, group) {
    return self === other
      ? true
      : self === null || other === null
      ? false
      : group.includes(self, other)
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.GroupReader<O, I>} schema
 * @returns {Schema.Schema<O|null, I>}
 */
export const nullable = schema => new Nullable(schema)

/**
 * @template O
 * @template [I=unknown]
 * @extends {API<O|undefined, I, Schema.GroupReader<O, I>>}
 * @implements {Schema.Schema<O|undefined, I>}
 */
class Optional extends API {
  optional() {
    return this
  }
  /**
   * @param {I} input
   * @param {Schema.Reader<O, I>} reader
   * @returns {Schema.ReadResult<O|undefined>}
   */
  readWith(input, reader) {
    const result = reader.read(input)
    return result?.error && input === undefined ? undefined : result
  }
  toString() {
    return `${this.settings}.optional()`
  }

  /**
   *
   * @param {O|undefined} self
   * @param {O|undefined} other
   * @param {Schema.Group<O>} group
   */
  includesWith(self, other, group) {
    return self === undefined
      ? true
      : other === undefined
      ? false
      : group.includes(self, other)
  }
}

/**
 * @template {unknown} O
 * @template [I=unknown]
 * @extends {API<O, I, {reader:Schema.GroupReader<O, I>, value:O & Schema.NotUndefined<O>}>}
 * @implements {Schema.DefaultSchema<O, I>}
 */
class Default extends API {
  /**
   * @returns {Schema.DefaultSchema<O & Schema.NotUndefined<O>, I>}
   */
  optional() {
    // Short circuit here as we there is no point in wrapping this in optional.
    return /** @type {Schema.DefaultSchema<O & Schema.NotUndefined<O>, I>} */ (
      this
    )
  }
  /**
   * @param {I} input
   * @param {object} options
   * @param {Schema.Reader<O|undefined, I>} options.reader
   * @param {O} options.value
   * @returns {Schema.ReadResult<O>}
   */
  readWith(input, { reader, value }) {
    if (input === undefined) {
      return /** @type {Schema.ReadResult<O>} */ (value)
    } else {
      const result = reader.read(input)

      return /** @type {Schema.ReadResult<O>} */ (
        result === undefined ? value : result
      )
    }
  }

  /**
   *
   * @param {O} self
   * @param {O} other
   * @param {object} options
   * @param {Schema.Group<O>} options.reader
   */
  includesWith(self, other, { reader: group }) {
    return group.includes(self, other)
  }

  toString() {
    return `${this.settings.reader}.default(${JSON.stringify(
      this.settings.value
    )})`
  }

  get value() {
    return this.settings.value
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.GroupReader<O, I>} schema
 * @returns {Schema.Schema<O|undefined, I>}
 */
export const optional = schema => new Optional(schema)

/**
 * @template O
 * @template [I=unknown]
 * @extends {API<O[], I, Schema.GroupReader<O, I>>}
 * @implements {Schema.ArraySchema<O, I>}
 */
class ArrayOf extends API {
  /**
   * @param {I} input
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
      if (result?.error) {
        return memberError({ at: index, cause: result })
      } else {
        results.push(result)
      }
    }
    return results
  }

  /**
   *
   * @param {O[]} self
   * @param {O[]} other
   * @param {Schema.Group<O>} group
   */
  includesWith(self, other, group) {
    // If arrays are of different length it is not obvious which semantics to
    // apply. With set semantics array with more elements includes array with
    // subset of it's elements. With structural (sub-typing) semantics structure
    // with subset of elements would include structure with superset of elements.
    // Here we choose treat arrays with different length as disjoint sets, so
    // neither of two will include the other, if arrays have same length then
    // one includes the other if each element includes the same positioned
    // element of the other.
    if (self.length === other.length) {
      for (const [index, element] of other.entries()) {
        if (!group.includes(self[index], element)) {
          return false
        }
      }
      return true
    } else {
      return false
    }
  }

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
 * @param {Schema.GroupReader<O, I>} schema
 * @returns {Schema.ArraySchema<O, I>}
 */
export const array = schema => new ArrayOf(schema)

/**
 * @template {Schema.GroupReader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @extends {API<Schema.InferTuple<U>, I, U>}
 * @implements {Schema.Schema<Schema.InferTuple<U>, I>}
 */
class Tuple extends API {
  /**
   * @param {I} input
   * @param {U} shape
   * @returns {Schema.ReadResult<Schema.InferTuple<U>>}
   */
  readWith(input, shape) {
    if (!Array.isArray(input)) {
      return typeError({ expect: 'array', actual: input })
    }
    if (input.length !== this.shape.length) {
      return new SchemaError(
        `Array must contain exactly ${this.shape.length} elements`
      )
    }

    const results = []
    for (const [index, reader] of shape.entries()) {
      const result = reader.read(input[index])
      if (result?.error) {
        return memberError({ at: index, cause: result })
      } else {
        results[index] = result
      }
    }

    return /** @type {Schema.InferTuple<U>} */ (results)
  }

  /**
   *
   * @param {Schema.InferTuple<U>} self
   * @param {Schema.InferTuple<U>} other
   * @param {U} shape
   */
  includesWith(self, other, shape) {
    for (const [index, group] of shape.entries()) {
      if (!group.includes(self[index], other[index])) {
        return false
      }
    }
    return true
  }

  /** @type {U} */
  get shape() {
    return this.settings
  }

  toString() {
    return `tuple([${this.shape.map(reader => reader.toString()).join(', ')}])`
  }
}

/**
 * @template {Schema.GroupReader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} shape
 * @returns {Schema.Schema<Schema.InferTuple<U>, I>}
 */
export const tuple = shape => new Tuple(shape)

/**
 * @template V
 * @template {string} K
 * @template [I=unknown]
 * @extends {API<Schema.Dictionary<K, V>, I, { key: Schema.Reader<K, string>, value: Schema.Reader<V, I> }>}
 * @implements {Schema.DictionarySchema<V, K, I>}
 */
class Dictionary extends API {
  /**
   * @param {I} input
   * @param {object} schema
   * @param {Schema.Reader<K, string>} schema.key
   * @param {Schema.Reader<V, I>} schema.value
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
      if (keyResult?.error) {
        return memberError({ at: k, cause: keyResult })
      }

      const valueResult = value.read(v)
      if (valueResult?.error) {
        return memberError({ at: k, cause: valueResult })
      }

      dict[keyResult] = valueResult
    }

    return dict
  }
  get key() {
    return this.settings.key
  }
  get value() {
    return this.settings.value
  }
  toString() {
    return `dictionary(${this.settings})`
  }
}

/**
 * @template {string} K
 * @template {unknown} V
 * @template [I=unknown]
 * @param {object} shape
 * @param {Schema.Reader<V, I>} shape.value
 * @param {Schema.Reader<K, string>} [shape.key]
 * @returns {Schema.DictionarySchema<V, K, I>}
 */
export const dictionary = ({ value, key = string() }) =>
  new Dictionary({ value, key })

/**
 * @template {[unknown, ...unknown[]]} T
 * @template [I=unknown]
 * @extends {API<T[number], I, {type: string, variants:Set<T[number]>}>}
 * @implements {Schema.Schema<T[number], I>}
 */
class Enum extends API {
  /**
   * @param {I} input
   * @param {{type:string, variants:Set<T[number]>}} settings
   * @returns {Schema.ReadResult<T[number]>}
   */
  readWith(input, { variants, type }) {
    if (variants.has(input)) {
      return /** @type {Schema.ReadResult<T[number]>} */ (input)
    } else {
      return typeError({ expect: type, actual: input })
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
 * @returns {Schema.Schema<U[number], I>}
 */
const createEnum = variants =>
  new Enum({
    type: variants.join('|'),
    variants: new Set(variants),
  })
export { createEnum as enum }

/**
 * @template {Schema.GroupReader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @extends {API<Schema.InferUnion<U>, I, U>}
 * @implements {Schema.Schema<Schema.InferUnion<U>, I>}
 */
class Union extends API {
  /**
   * @param {I} input
   * @param {U} variants
   */
  readWith(input, variants) {
    const causes = []
    for (const reader of variants) {
      const result = reader.read(input)
      if (result?.error) {
        causes.push(result)
      } else {
        return result
      }
    }
    return new UnionError({ causes })
  }

  get variants() {
    return this.settings
  }
  toString() {
    return `union([${this.variants.map(type => type.toString()).join(', ')}])`
  }

  /**
   * @param {Schema.InferUnion<U>} self
   * @param {Schema.InferUnion<U>} other
   * @param {U} variants
   */
  includesWith(self, other, variants) {
    for (const group of variants) {
      // try catch here is really uncomfortable, but unfortunately right now
      // we have no better way because `self` maybe of variant A and `other` may
      // be of variant B and since we don't know which one is which there is
      // no way for us to compare.
      try {
        return group.includes(self, other)
      } catch {}
    }
    return false
  }
}

/**
 * @template {Schema.GroupReader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} variants
 * @returns {Schema.Schema<Schema.InferUnion<U>, I>}
 */
const union = variants => new Union(variants)

/**
 * @template T, U
 * @template [I=unknown]
 * @param {Schema.GroupReader<T, I>} left
 * @param {Schema.GroupReader<U, I>} right
 * @returns {Schema.Schema<T|U, I>}
 */
export const or = (left, right) => union([left, right])

/**
 * @template {Schema.GroupReader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @extends {API<Schema.InferIntersection<U>, I, U>}
 * @implements {Schema.Schema<Schema.InferIntersection<U>, I>}
 */
class Intersection extends API {
  /**
   * @param {I} input
   * @param {U} schemas
   * @returns {Schema.ReadResult<Schema.InferIntersection<U>>}
   */
  readWith(input, schemas) {
    const causes = []
    for (const schema of schemas) {
      const result = schema.read(input)
      if (result?.error) {
        causes.push(result)
      }
    }

    return causes.length > 0
      ? new IntersectionError({ causes })
      : /** @type {Schema.ReadResult<Schema.InferIntersection<U>>} */ (input)
  }

  /**
   * @param {Schema.InferIntersection<U>} self
   * @param {Schema.InferIntersection<U>} other
   * @param {U} schemas
   */
  includesWith(self, other, schemas) {
    for (const group of schemas) {
      if (!group.includes(self, other)) {
        return false
      }
    }
    return true
  }
  toString() {
    return `intersection([${this.settings
      .map(type => type.toString())
      .join(',')}])`
  }
}

/**
 * @template {Schema.GroupReader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} variants
 * @returns {Schema.Schema<Schema.InferIntersection<U>, I>}
 */
export const intersection = variants => new Intersection(variants)

/**
 * @template T, U
 * @template [I=unknown]
 * @param {Schema.GroupReader<T, I>} left
 * @param {Schema.GroupReader<U, I>} right
 * @returns {Schema.Schema<T & U, I>}
 */
export const and = (left, right) => intersection([left, right])

/**
 * @template [I=unknown]
 * @extends {API<boolean, I>}
 */
class Boolean extends API {
  /**
   * @param {I} input
   */
  readWith(input) {
    switch (input) {
      case true:
      case false:
        return /** @type {boolean} */ (input)
      default:
        return typeError({
          expect: 'boolean',
          actual: input,
        })
    }
  }

  toString() {
    return `boolean()`
  }
}

/** @type {Schema.Schema<boolean, unknown>} */
const anyBoolean = new Boolean()

export const boolean = () => anyBoolean

/**
 * @template {number} [O=number]
 * @template [I=unknown]
 * @template [Settings=void]
 * @extends {API<O, I, Settings>}
 * @implements {Schema.NumberSchema<O, I>}
 */
class UnknownNumber extends API {
  /**
   * @param {number} n
   */
  greaterThan(n) {
    return this.refine(greaterThan(n))
  }
  /**
   * @param {number} n
   */
  lessThan(n) {
    return this.refine(lessThan(n))
  }

  /**
   * @template {O} U
   * @param {Schema.Reader<U, O>} schema
   * @returns {Schema.NumberSchema<U, I>}
   */
  refine(schema) {
    return new RefinedNumber({ base: this, schema })
  }

  /**
   *
   * @param {O} self
   * @param {O} other
   */
  includesWith(self, other) {
    return self >= other
  }
}

/**
 * @template [I=unknown]
 * @extends {UnknownNumber<number, I>}
 * @implements {Schema.NumberSchema<number, I>}
 */
class AnyNumber extends UnknownNumber {
  /**
   * @param {I} input
   * @returns {Schema.ReadResult<number>}
   */
  readWith(input) {
    return typeof input === 'number'
      ? input
      : typeError({ expect: 'number', actual: input })
  }
  toString() {
    return `number()`
  }
}

/** @type {Schema.NumberSchema<number, unknown>} */
const anyNumber = new AnyNumber()
export const number = () => anyNumber

/**
 * @template {number} [T=number]
 * @template {T} [O=T]
 * @template [I=unknown]
 * @extends {UnknownNumber<O, I, {base:Schema.Reader<T, I>, schema:Schema.Reader<O, T>}>}
 * @implements {Schema.NumberSchema<O, I>}
 */
class RefinedNumber extends UnknownNumber {
  /**
   * @param {I} input
   * @param {{base:Schema.Reader<T, I>, schema:Schema.Reader<O, T>}} settings
   * @returns {Schema.ReadResult<O>}
   */
  readWith(input, { base, schema }) {
    const result = base.read(input)
    return result?.error ? result : schema.read(result)
  }
  toString() {
    return `${this.settings.base}.refine(${this.settings.schema})`
  }
}

/**
 * @template {number} T
 * @extends {API<T, T, number>}
 */
class LessThan extends API {
  /**
   * @param {T} input
   * @param {number} number
   * @returns {Schema.ReadResult<T>}
   */
  readWith(input, number) {
    if (input < number) {
      return input
    } else {
      return error(`Expected ${input} < ${number}`)
    }
  }
  toString() {
    return `lessThan(${this.settings})`
  }
}

/**
 * @template {number} T
 * @param {number} n
 * @returns {Schema.Schema<T, T>}
 */
export const lessThan = n => new LessThan(n)

/**
 * @template {number} T
 * @extends {API<T, T, number>}
 */
class GreaterThan extends API {
  /**
   * @param {T} input
   * @param {number} number
   * @returns {Schema.ReadResult<T>}
   */
  readWith(input, number) {
    if (input > number) {
      return input
    } else {
      return error(`Expected ${input} > ${number}`)
    }
  }
  toString() {
    return `greaterThan(${this.settings})`
  }
}

/**
 * @template {number} T
 * @param {number} n
 * @returns {Schema.Schema<T, T>}
 */
export const greaterThan = n => new GreaterThan(n)

const Integer = {
  /**
   * @param {number} input
   * @returns {Schema.ReadResult<Schema.Integer>}
   */
  read(input) {
    return Number.isInteger(input)
      ? /** @type {Schema.Integer} */ (input)
      : typeError({
          expect: 'integer',
          actual: input,
        })
  },
  toString() {
    return `Integer`
  },
}

const anyInteger = anyNumber.refine(Integer)
export const integer = () => anyInteger

const Float = {
  /**
   * @param {number} number
   * @returns {Schema.ReadResult<Schema.Float>}
   */
  read(number) {
    return Number.isFinite(number)
      ? /** @type {Schema.Float} */ (number)
      : typeError({
          expect: 'Float',
          actual: number,
        })
  },
  toString() {
    return 'Float'
  },
}

const anyFloat = anyNumber.refine(Float)
export const float = () => anyFloat

/**
 * @template {string} [O=string]
 * @template [I=unknown]
 * @template [Settings=void]
 * @extends {API<O, I, Settings>}
 */
class UnknownString extends API {
  /**
   * @template {O|unknown} U
   * @param {Schema.Reader<U, O>} schema
   * @returns {Schema.StringSchema<O & U, I>}
   */
  refine(schema) {
    const other = /** @type {Schema.Reader<U, O>} */ (schema)
    const rest = new RefinedString({
      base: this,
      schema: other,
    })

    return /** @type {Schema.StringSchema<O & U, I>} */ (rest)
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

  /**
   * @param {O} self
   * @param {O} other
   */
  includesWith(self, other) {
    return self.includes(other)
  }
  toString() {
    return `string()`
  }
}

/**
 * @template O
 * @template {string} [T=string]
 * @template [I=unknown]
 * @extends {UnknownString<T & O, I, {base:Schema.Reader<T, I>, schema:Schema.Reader<O, T>}>}
 * @implements {Schema.StringSchema<O & T, I>}
 */
class RefinedString extends UnknownString {
  /**
   * @param {I} input
   * @param {{base:Schema.Reader<T, I>, schema:Schema.Reader<O, T>}} settings
   * @returns {Schema.ReadResult<T & O>}
   */
  readWith(input, { base, schema }) {
    const result = base.read(input)
    return result?.error
      ? result
      : /** @type {Schema.ReadResult<T & O>} */ (schema.read(result))
  }
  toString() {
    return `${this.settings.base}.refine(${this.settings.schema})`
  }
}

/**
 * @template [I=unknown]
 * @extends {UnknownString<string, I>}
 * @implements {Schema.StringSchema<string, I>}
 */
class AnyString extends UnknownString {
  /**
   * @param {I} input
   * @returns {Schema.ReadResult<string>}
   */
  readWith(input) {
    return typeof input === 'string'
      ? input
      : typeError({ expect: 'string', actual: input })
  }
}

/** @type {Schema.StringSchema<string, unknown>} */
const anyString = new AnyString()
export const string = () => anyString

/**
 * @template {string} Prefix
 * @template {string} Body
 * @extends {API<Body & `${Prefix}${Body}`, Body, Prefix>}
 * @implements {Schema.Schema<Body & `${Prefix}${Body}`, Body>}
 */
class StartsWith extends API {
  /**
   * @param {Body} input
   * @param {Prefix} prefix
   */
  readWith(input, prefix) {
    return input.startsWith(prefix)
      ? /** @type {Schema.ReadResult<Body & `${Prefix}${string}`>} */ (input)
      : error(`Expect string to start with "${prefix}" instead got "${input}"`)
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
 * @template {string} Body
 * @param {Prefix} prefix
 * @returns {Schema.Schema<`${Prefix}${string}`, string>}
 */
export const startsWith = prefix => new StartsWith(prefix)

/**
 * @template {string} Suffix
 * @template {string} Body
 * @extends {API<Body & `${Body}${Suffix}`, Body, Suffix>}
 */
class EndsWith extends API {
  /**
   * @param {Body} input
   * @param {Suffix} suffix
   */
  readWith(input, suffix) {
    return input.endsWith(suffix)
      ? /** @type {Schema.ReadResult<Body & `${string}${Suffix}`>} */ (input)
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
 * @param {Suffix} suffix
 * @returns {Schema.Schema<`${string}${Suffix}`, string>}
 */
export const endsWith = suffix => new EndsWith(suffix)

/**
 * @template T
 * @template {T} U
 * @template [I=unknown]
 * @extends {API<U, I, { base: Schema.Reader<T, I>, schema: Schema.Reader<U, T> }>}
 * @implements {Schema.Schema<U, I>}
 */

class Refine extends API {
  /**
   * @param {I} input
   * @param {{ base: Schema.Reader<T, I>, schema: Schema.Reader<U, T> }} settings
   */
  readWith(input, { base, schema }) {
    const result = base.read(input)
    return result?.error ? result : schema.read(result)
  }
  toString() {
    return `${this.settings.base}.refine(${this.settings.schema})`
  }
}

/**
 * @template T
 * @template [I=unknown]
 * @extends {API<T, I, { base: Schema.Reader<T, I>, group: Schema.Group<T, T> }>}
 * @implements {Schema.Schema<T, I>}
 */

class SchemaWithGroup extends API {
  /**
   * @param {I} input
   * @param {{ base: Schema.Reader<T, I> }} settings
   */
  readWith(input, { base }) {
    return base.read(input)
  }
  toString() {
    return `${this.settings.base})`
  }
  /**
   * @param {T} group
   * @param {T} member
   */
  includes(group, member) {
    return this.settings.group.includes(group, member)
  }
}

/**
 * @template T
 * @template {T} U
 * @template [I=unknown]
 * @param {Schema.Reader<T, I>} base
 * @param {Schema.Reader<U, T>} schema
 * @returns {Schema.Schema<U, I>}
 */
export const refine = (base, schema) => new Refine({ base, schema })

/**
 * @template {null|boolean|string|number} T
 * @template [I=unknown]
 * @extends {API<T, I, T>}
 * @implements {Schema.LiteralSchema<T, I>}
 */
class Literal extends API {
  /**
   * @param {I} input
   * @param {T} expect
   * @returns {Schema.ReadResult<T>}
   */
  readWith(input, expect) {
    return input !== /** @type {unknown} */ (expect)
      ? new LiteralError({ expect, actual: input })
      : expect
  }
  get value() {
    return /** @type {Exclude<T, undefined>} */ (this.settings)
  }
  /**
   * @template {Schema.NotUndefined<T>} U
   * @param {U} value
   */
  default(value = /** @type {U} */ (this.value)) {
    return super.default(value)
  }
  toString() {
    return `literal(${displayTypeName(this.value)})`
  }
}

/**
 * @template {null|boolean|string|number} T
 * @template [I=unknown]
 * @param {T} value
 * @returns {Schema.LiteralSchema<T, I>}
 */
export const literal = value => new Literal(value)

/**
 * @template {{[key:string]: Schema.GroupReader}} U
 * @template [I=unknown]
 * @extends {API<Schema.InferStruct<U>, I, U>}
 */
class Struct extends API {
  /**
   * @param {I} input
   * @param {U} shape
   * @returns {Schema.ReadResult<Schema.InferStruct<U>>}
   */
  readWith(input, shape) {
    if (typeof input != 'object' || input === null || Array.isArray(input)) {
      return typeError({
        expect: 'object',
        actual: input,
      })
    }

    const source = /** @type {{[K in keyof U]: unknown}} */ (input)

    const struct = /** @type {{[K in keyof U]: Schema.Infer<U[K]>}} */ ({})
    const entries =
      /** @type {{[K in keyof U]: [K & string, U[K]]}[keyof U][]} */ (
        Object.entries(shape)
      )

    for (const [at, reader] of entries) {
      const result = reader.read(source[at])
      if (result?.error) {
        return memberError({ at, cause: result })
      }
      // skip undefined because they mess up CBOR and are generally useless.
      else if (result !== undefined) {
        struct[at] = /** @type {Schema.Infer<U[typeof at]>} */ (result)
      }
    }

    return struct
  }

  /**
   * @param {Schema.InferStruct<U>} self
   * @param {Schema.InferStruct<U>} other
   * @param {U} shape
   */
  includesWith(self, other, shape) {
    for (const [key, group] of Object.entries(shape)) {
      const name = /** @type {keyof self} */ (key)
      if (!group.includes(self[name], other[name])) {
        return false
      }
    }

    return true
  }

  /** @type {U} */
  get shape() {
    // @ts-ignore - We declared `settings` private but we access it here
    return this.settings
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
   * @param {Schema.InferStructSource<U>} data
   */
  create(data) {
    return this.from(data || {})
  }

  /**
   * @template {{[key:string]: Schema.Reader}} E
   * @param {E} extension
   * @returns {Schema.StructSchema<U & E, I>}
   */
  extend(extension) {
    return new Struct({ ...this.shape, ...extension })
  }
}

/**
 * @template {null|boolean|string|number} T
 * @template {{[key:string]: T|Schema.GroupReader}} U
 * @template {{[K in keyof U]: U[K] extends Schema.GroupReader ? U[K] : Schema.LiteralSchema<U[K] & T>}} V
 * @template [I=unknown]
 * @param {U} fields
 * @returns {Schema.StructSchema<V, I>}
 */
export const struct = fields => {
  const shape =
    /** @type {{[K in keyof U]: Schema.GroupReader<unknown, unknown>}} */ ({})
  /** @type {[keyof U & string, T|Schema.GroupReader][]} */
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

  return new Struct(/** @type {V} */ (shape))
}

/**
 * @param {string} message
 * @returns {Schema.Error}
 */
export const error = message => new SchemaError(message)

class SchemaError extends Error {
  get name() {
    return 'SchemaError'
  }
  /** @type {true} */
  get error() {
    return true
  }
  /* c8 ignore next 3 */
  describe() {
    return this.name
  }
  get message() {
    return this.describe()
  }

  toJSON() {
    const { error, name, message, stack } = this
    return { error, name, message, stack }
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
 * @returns {Schema.Error}
 */
export const typeError = data => new TypeError(data)

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
    case 'number':
    case 'symbol':
    case 'undefined':
      return String(value)
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
 * @returns {Schema.Error}
 */
export const memberError = ({ at, cause }) =>
  typeof at === 'string'
    ? new FieldError({ at, cause })
    : new ElementError({ at, cause })

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

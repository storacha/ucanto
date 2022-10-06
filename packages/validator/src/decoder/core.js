import * as Schema from './type.js'

export * from './type.js'

/**
 * @template [T=any]
 * @template [I=unknown]
 * @template [Settings=void]
 * @implements {Schema.Schema<T, I>}
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
   * @param {I} _input
   * @param {Settings} _settings
   * @returns {Schema.Read<T>}
   * @abstract
   */
  readWith(_input, _settings) {
    throw new Error(`Abstract method readWith must be implemented by subclass`)
  }
  /**
   * @param {I} input
   * @returns {Schema.Read<T>}
   */
  read(input) {
    return this.readWith(input, this.settings)
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
   * @param {Schema.Reader<U, I>} schema
   * @returns {Schema.Schema<T | U, I>}
   */

  or(schema) {
    return or(this, schema)
  }

  /**
   * @template U
   * @param {Schema.Reader<U, I>} schema
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
   * @template {string} Kind
   * @param {Kind} [kind]
   * @returns {Schema.Schema<Schema.Branded<T, Kind>, I>}
   */
  brand(kind) {
    return /** @type {Schema.Schema<Schema.Branded<T, Kind>, I>} */ (this)
  }

  /**
   * @param {T} value
   * @returns {Schema.Schema<T, I>}
   */
  default(value) {
    return new Default({
      reader: /** @type {Schema.Reader<T, I>} */ (this),
      value,
    })
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
   * @returns {Schema.Read<never>}
   */
  read(input) {
    return new TypeError({ expect: 'never', actual: input })
  }
  /**
   * @param {never} value
   * @returns {never}
   */
  default(value) {
    throw new Error(
      `Can not call never().default(value) because no default will satisify never type`
    )
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
  readWith(input) {
    return /** @type {Schema.Read<unknown>}*/ (input)
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
 * @extends {API<null|O, I, Schema.Reader<O, I>>}
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
            causes: [result, new TypeError({ expect: 'null', actual: input })],
          })
    } else {
      return result
    }
  }
  toString() {
    return `${this.settings}.nullable()`
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.Reader<O, I>} schema
 * @returns {Schema.Schema<O|null, I>}
 */
export const nullable = schema => new Nullable(schema)

/**
 * @template O
 * @template [I=unknown]
 * @extends {API<O|undefined, I, Schema.Reader<O, I>>}
 * @implements {Schema.Schema<O|undefined, I>}
 */
class Optional extends API {
  optional() {
    return this
  }
  /**
   * @param {I} input
   * @param {Schema.Reader<O, I>} reader
   * @returns {Schema.Read<O|undefined>}
   */
  readWith(input, reader) {
    const result = reader.read(input)
    return result?.error && input === undefined ? undefined : result
  }
  toString() {
    return `${this.settings}.optional()`
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @extends {API<O, I, {reader:Schema.Reader<O, I>, value:O}>}
 * @implements {Schema.Schema<O, I>}
 */
class Default extends API {
  /**
   * @returns {Schema.Schema<O|undefined, I>}
   */
  optional() {
    // Short circuit here as we there is no point in wrapping this in optional.
    return /** @type {Schema.Schema<O|undefined, I>} */ (this)
  }
  /**
   * @param {I} input
   * @param {object} options
   * @param {Schema.Reader<O, I>} options.reader
   * @param {O} options.value
   * @returns {Schema.Read<O>}
   */
  readWith(input, { reader, value }) {
    const result = reader.read(input)
    return result?.error && input === undefined
      ? /** @type {Schema.Read<O>} */ (value)
      : result
  }
  toString() {
    return `${this.settings.reader}.default(${JSON.stringify(
      this.settings.value
    )})`
  }
}

/**
 * @template O
 * @template [I=unknown]
 * @param {Schema.Reader<O, I>} schema
 * @returns {Schema.Schema<O|undefined, I>}
 */
export const optional = schema => new Optional(schema)

/**
 * @template O
 * @template [I=unknown]
 * @extends {API<O[], I, Schema.Reader<O, I>>}
 * @implements {Schema.Schema<O[], I>}
 */
class ArrayOf extends API {
  /**
   * @param {I} input
   * @param {Schema.Reader<O, I>} schema
   */
  readWith(input, schema) {
    if (!Array.isArray(input)) {
      return new TypeError({ expect: 'array', actual: input })
    }
    /** @type {O[]} */
    const results = []
    for (const [index, value] of input.entries()) {
      const result = schema.read(value)
      if (result?.error) {
        return new ElementError({ at: index, cause: result })
      } else {
        results.push(result)
      }
    }
    return results
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
 * @param {Schema.Reader<O, I>} schema
 * @returns {Schema.Schema<O[], I>}
 */
export const array = schema => new ArrayOf(schema)

/**
 * @template {Schema.Reader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @extends {API<Schema.InferTuple<U>, I, U>}
 * @implements {Schema.Schema<Schema.InferTuple<U>, I>}
 */
class Tuple extends API {
  /**
   * @param {I} input
   * @param {U} shape
   * @returns {Schema.Read<Schema.InferTuple<U>>}
   */
  readWith(input, shape) {
    if (!Array.isArray(input)) {
      return new TypeError({ expect: 'array', actual: input })
    }

    const results = []
    for (const [index, reader] of shape.entries()) {
      const result = reader.read(input[index])
      if (result?.error) {
        return new ElementError({ at: index, cause: result })
      } else {
        results[index] = result
      }
    }

    return /** @type {Schema.InferTuple<U>} */ (results)
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
 * @template {Schema.Reader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} shape
 * @returns {Schema.Schema<Schema.InferTuple<U>, I>}
 */
export const tuple = shape => new Tuple(shape)

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
   * @returns {Schema.Read<T[number]>}
   */
  readWith(input, { variants, type }) {
    if (variants.has(input)) {
      return /** @type {Schema.Read<T[number]>} */ (input)
    } else {
      return new TypeError({ expect: type, actual: input })
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
 * @template {Schema.Reader<unknown, I>} T
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
    return `union([${this.variants.map(type => type.toString()).join(',')}])`
  }
}

/**
 * @template {Schema.Reader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} variants
 * @returns {Schema.Schema<Schema.InferUnion<U>, I>}
 */
const union = variants => new Union(variants)

/**
 * @template T, U
 * @template [I=unknown]
 * @param {Schema.Reader<T, I>} left
 * @param {Schema.Reader<U, I>} right
 * @returns {Schema.Schema<T|U, I>}
 */
export const or = (left, right) => union([left, right])

/**
 * @template {Schema.Reader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @extends {API<Schema.InferIntesection<U>, I, U>}
 * @implements {Schema.Schema<Schema.InferIntesection<U>, I>}
 */
class Intersection extends API {
  /**
   * @param {I} input
   * @param {U} schemas
   * @returns {Schema.Read<Schema.InferIntesection<U>>}
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
      : /** @type {Schema.Read<Schema.InferIntesection<U>>} */ (input)
  }
  toString() {
    return `intersection([${this.settings
      .map(type => type.toString())
      .join(',')}])`
  }
}

/**
 * @template {Schema.Reader<unknown, I>} T
 * @template {[T, ...T[]]} U
 * @template [I=unknown]
 * @param {U} variants
 * @returns {Schema.Schema<Schema.InferIntesection<U>, I>}
 */
export const intersection = variants => new Intersection(variants)

/**
 * @template T, U
 * @template [I=unknown]
 * @param {Schema.Reader<T, I>} left
 * @param {Schema.Reader<U, I>} right
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
        return new TypeError({
          expect: 'boolean',
          actual: input,
        })
    }
  }
  toString() {
    return `boolean()`
  }
}

/**
 * @template {unknown} I
 * @returns {Schema.Schema<boolean, I>}
 */
export const boolean = () => new Boolean()

/**
 * @template {number} [O=number]
 * @template [I=unknown]
 * @template [Settings=void]
 * @extends {API<O, I, Settings>}
 * @implements {Schema.Schema<O, I>}
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
   */
  refine(schema) {
    return new RefinedNumber({ base: this, schema })
  }
}

/**
 * @template [I=unknown]
 * @extends {UnknownNumber<number, I>}
 * @implements {Schema.Schema<number, I>}
 */
class AnyNumber extends UnknownNumber {
  /**
   * @param {I} input
   * @returns {Schema.Read<number>}
   */
  readWith(input) {
    return typeof input === 'number'
      ? input
      : new TypeError({ expect: 'number', actual: input })
  }
  toString() {
    return `number()`
  }
}

const anyNumber = new AnyNumber()
export const number = () => anyNumber

/**
 * @template {number} [T=number]
 * @template {T} [O=T]
 * @template [I=unknown]
 * @extends {UnknownNumber<O, I, {base:Schema.Reader<T, I>, schema:Schema.Reader<O, T>}>}
 * @implements {Schema.Schema<O, I>}
 */
class RefinedNumber extends UnknownNumber {
  /**
   * @param {I} input
   * @param {{base:Schema.Reader<T, I>, schema:Schema.Reader<O, T>}} settings
   * @returns {Schema.Read<O>}
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
   * @returns {Schema.Read<T>}
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
   * @returns {Schema.Read<T>}
   */
  readWith(input, number) {
    if (input > number) {
      return input
    } else {
      return error(`Expected ${input} < ${number}`)
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
   * @returns {Schema.Read<Schema.Integer>}
   */
  read(input) {
    return Number.isInteger(input)
      ? input
      : new TypeError({
          expect: 'Integer',
          actual: input,
        })
  },
  toString() {
    return `Integer`
  },
}

export const integer = () => anyNumber.refine(Integer)

const Float = {
  /**
   * @param {number} number
   * @returns {Schema.Read<Schema.Float>}
   */
  read(number) {
    return Number.isFinite(number)
      ? number
      : new TypeError({
          expect: 'Float',
          actual: number,
        })
  },
  toString() {
    return 'Float'
  },
}
export const float = () => anyNumber.refine(Float)

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

    return rest
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
   * @returns {Schema.Read<T & O>}
   */
  readWith(input, { base, schema }) {
    const result = base.read(input)
    return result?.error
      ? result
      : /** @type {Schema.Read<T & O>} */ (schema.read(result))
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
   * @returns {Schema.Read<string>}
   */
  readWith(input) {
    return typeof input === 'string'
      ? input
      : new TypeError({ expect: 'string', actual: input })
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
class StratsWith extends API {
  /**
   * @param {Body} input
   * @param {Prefix} prefix
   */
  readWith(input, prefix) {
    return input.startsWith(prefix)
      ? /** @type {Schema.Read<Body & `${Prefix}${string}`>} */ (input)
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
export const startsWith = prefix => new StratsWith(prefix)

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
      ? /** @type {Schema.Read<Body & `${string}${Suffix}`>} */ (input)
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
 * @template {string} Body
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
 * @implements {Schema.Schema<T, I>}
 */
class Literal extends API {
  /**
   * @param {I} input
   * @param {T} expect
   * @returns {Schema.Read<T>}
   */
  readWith(input, expect) {
    return input !== /** @type {unknown} */ (expect)
      ? new LiteralError({ expect, actual: input })
      : expect
  }
  get value() {
    return this.settings
  }
  toString() {
    return `literal(${displayTypeName(this.value)})`
  }
}

/**
 * @template {null|boolean|string|number} T
 * @template [I=unknown]
 * @param {T} value
 * @returns {Schema.Schema<T, I>}
 */
export const literal = value => new Literal(value)

/**
 * @template {Schema.Reader<unknown, unknown>} T
 * @template {{[key:string]: T}} U
 * @template [I=unknown]
 * @extends {API<Schema.InferStruct<U>, I, U>}
 */
class Struct extends API {
  /**
   * @param {I} input
   * @param {U} shape
   * @returns {Schema.Read<Schema.InferStruct<U>>}
   */
  readWith(input, shape) {
    if (typeof input === 'object' && input !== null) {
      return new TypeError({
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
        return new FieldError({ at, cause: result })
      }
      // skip undefined because they mess up CBOR and are generally useless.
      else if (result !== undefined) {
        struct[at] = /** @type {Schema.Infer<U[typeof at]>} */ (result)
      }
    }

    return struct
  }

  /** @type {U} */
  get shape() {
    // @ts-ignore - We declared `settings` private but we access it here
    return this.settings
  }

  toString() {
    return [
      `struct({`,
      ...Object.entries(this.shape).map(([key, schema]) =>
        indent(`${key}: ${schema}`)
      ),
      `})`,
    ].join('\n')
  }
}

/**
 * @template {Schema.Reader<unknown, unknown>|null|boolean|string|number} T
 * @template {{[key:string]: T}} U
 * @template {{[K in keyof U]: U[K] extends Schema.Reader<unknown, unknown> ? U[K] : Schema.Reader<unknown, U[K]>}} V
 * @template [I=unknown]
 * @param {U} fields
 * @returns {Schema.Schema<Schema.InferStruct<V>, I>}
 */
export const struct = fields => {
  const shape = /** @type {{[K in keyof U]: unknown}} */ ({})
  /** @type {[keyof U, T][]} */
  const entries = Object.entries(fields)

  for (const [key, field] of entries) {
    switch (typeof field) {
      case 'number':
      case 'string':
      case 'boolean':
        shape[key] = literal(field)
        break
      default:
        shape[key] = field === null ? literal(field) : field
        break
    }
  }

  return new Struct(/** @type {V} */ (shape))
}

/**
 * @param {string} message
 * @returns {Schema.ReadError}
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
  describe() {
    return this.name
  }
  get message() {
    return this.describe()
  }

  toJSON() {
    const { error, name, message } = this
    return { error, name, message }
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
 * @param {string} expect
 * @param {unknown} actual
 * @returns {Schema.ReadError}
 */
export const typeError = (expect, actual) => new TypeError({ expect, actual })

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
    return `Expected value ${JSON.stringify(
      this.expect
    )} instead got ${JSON.stringify(this.actual)}`
  }
}

class ElementError extends SchemaError {
  /**
   * @param {{at:number, cause:Schema.ReadError}} data
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
   * @param {{at:string, cause:Schema.ReadError}} data
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
    return `Object contains invalid field ${this.at}\n  - ${this.cause.message}`
  }
}

/**
 * @param {string|number} at
 * @param {Schema.ReadError} cause
 * @returns {Schema.ReadError}
 */
export const memberError = (at, cause) =>
  typeof at === 'string'
    ? new FieldError({ at, cause })
    : new ElementError({ at, cause })

class UnionError extends SchemaError {
  /**
   * @param {{causes: Schema.ReadError[]}} data
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
   * @param {{causes: Schema.ReadError[]}} data
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
export const indent = (message, indent = '  ') =>
  `${indent}${message.split('\n').join(`\n${indent}`)}`

/**
 * @param {string} message
 */
export const li = message => indent(`- ${message}`)

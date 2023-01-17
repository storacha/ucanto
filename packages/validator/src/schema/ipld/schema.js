import * as The from './api.js'

export * from './api.js'
export * as The from './api.js'

/**
 * @template {The.IPLD.Type} Type
 * @param {Type} json
 * @returns {The.Schema<The.TypeFromJSON<Type>, unknown>}
 */
export const fromJSON = json => {
  const [type, value] = match(/** @type {The.IPLD.Type} */ (json))
  switch (type) {
    case 'any':
      return /** @type {The.Schema<any>} */ (TheUnknown)
    case 'bool':
      return /** @type {The.Schema<any>} */ (TheBoolean)
    case 'string':
      return /** @type {The.Schema<any>} */ (TheString)
    case 'bytes':
      return /** @type {The.Schema<any>} */ (TheBytes)
    case 'int':
      return /** @type {The.Schema<any>} */ (TheInteger)
    case 'float':
      return /** @type {The.Schema<any>} */ (TheFloat)
    case 'map':
      return /** @type {The.Schema<any>} */ (MapSchema.fromJSON({ map: value }))
    default:
      throw new Error(`Not implemented`)
  }
}

/**
 * @template {{}} T
 * @template {unknown} U
 * @template {The.Schema<T, U>} Schema
 * @implements {The.Schema<T|null, U|null>}
 */
class Nullable {
  /**
   * @param {object} source
   * @param {Schema} source.schema
   */
  constructor({ schema }) {
    this.valueSchema = schema
  }
  /**
   * @param {unknown} source
   */
  conform(source) {
    if (source === null) {
      return { ok: null }
    } else {
      return this.valueSchema.conform(source)
    }
  }

  /**
   * @param {T|null} view
   */
  encode(view) {
    return view === null ? { ok: null } : this.valueSchema.encode(view)
  }

  /**
   * @param {U|null} model
   */
  decode(model) {
    return model === null ? { ok: null } : this.valueSchema.decode(model)
  }

  /**
   *
   * @returns {The.IPLD.Type}
   */

  toJSON() {
    const unit = { unit: { representation: null } }
    return {
      union: {
        members: [unit, this.valueSchema.toJSON()],
        representation: {
          kinded: {
            null: unit,
            value: this.valueSchema.toJSON(),
          },
        },
      },
    }
  }
}

const UnknownSchema = class Unknown {
  /**
   * @param {unknown} source
   */
  conform(source) {
    return { ok: source }
  }

  /**
   * @param {boolean} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {boolean} model
   */
  decode(model) {
    return this.conform(model)
  }

  toJSON() {
    return { any: {} }
  }
}

/** @type {The.Schema<unknown, unknown, The.ConformanceError, { any: The.IPLD.AnyType }>} */
const TheUnknown = new UnknownSchema()

export const unknown = () => TheUnknown

const BooleanSchema = class Boolean {
  /**
   * @param {unknown} input
   */
  conform(input) {
    switch (input) {
      case true:
      case false:
        return { ok: input }
      default:
        return { error: new KindError({ schema: TheBoolean, value: input }) }
    }
  }

  /**
   * @param {boolean} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {boolean} model
   */
  decode(model) {
    return this.conform(model)
  }

  toJSON() {
    return { bool: {} }
  }
}

/** @type {The.Schema<boolean, boolean, The.ConformanceError, { bool: The.IPLD.BooleanType }>} */
const TheBoolean = new BooleanSchema()

export const Boolean = TheBoolean
export const boolean = () => Boolean

/**
 * @implements {The.Schema<string, unknown, KindError>}
 */
const StringSchema = class String {
  /**
   * @param {unknown} input
   */
  conform(input) {
    return typeof input === 'string'
      ? { ok: input }
      : { error: new KindError({ schema: TheString, value: input }) }
  }

  /**
   * @param {string} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {string} model
   */
  decode(model) {
    return this.conform(model)
  }

  toJSON() {
    return { string: {} }
  }
}

/** @type {The.Schema<string, string, The.ConformanceError, { string: The.IPLD.StringType }>} */
const TheString = new StringSchema()
export { TheString as String }
export const string = () => TheString

const BytesSchema = class Bytes {
  /**
   * @param {unknown} input
   */
  conform(input) {
    return input instanceof Uint8Array
      ? { ok: input }
      : { error: new KindError({ schema: TheBytes, value: input }) }
  }

  /**
   * @param {Uint8Array} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {Uint8Array} model
   */
  decode(model) {
    return this.conform(model)
  }

  toJSON() {
    return { bytes: { representation: { bytes: {} } } }
  }
}

/** @type {The.Schema<Uint8Array, Uint8Array, The.ConformanceError, { bytes: The.IPLD.BytesType }>} */
const TheBytes = new BytesSchema()
export const Bytes = TheBytes
export const bytes = () => TheBytes

const IntegerSchema = class Integer {
  /**
   * @param {unknown} input
   */
  conform(input) {
    return typeof input === 'number' && Number.isInteger(input)
      ? { ok: input }
      : { error: kindError({ schema: TheInteger, value: input }) }
  }

  /**
   * @param {The.integer} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {The.integer} model
   */
  decode(model) {
    return this.conform(model)
  }

  toJSON() {
    return { int: {} }
  }
}

/** @type  {The.Schema<The.integer, The.integer, The.ConformanceError, { int: The.IPLD.IntType }>} */
const TheInteger = new IntegerSchema()

export const Integer = TheInteger
export const integer = () => TheInteger

const FloatSchema = class FloatSchema {
  /**
   * @param {unknown} input
   */
  conform(input) {
    return typeof input === 'number' && Number.isFinite(input)
      ? { ok: input }
      : { error: kindError({ schema: Float, value: input }) }
  }

  /**
   * @param {The.float} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {The.float} model
   */
  decode(model) {
    return this.conform(model)
  }

  toJSON() {
    return { float: {} }
  }
}

/**
 * @type {The.Schema<The.float, The.float, The.ConformanceError, { float: The.IPLD.FloatType }>}
 */
const TheFloat = new FloatSchema()
export const float = () => TheFloat
export const Float = TheFloat

/**
 * @template {string} Key
 * @template {unknown} Value
 * @template {The.Schema<Value, any>} ValueSchema
 * @template {The.Schema<Key, any>} KeySchema
 * @implements {The.Schema<Record<Key, Value>>}
 */
class MapSchema {
  /**
   *
   * @param {object} settings
   * @param {KeySchema} settings.key
   * @param {ValueSchema} settings.value
   */
  constructor({ key, value }) {
    this.key = key
    this.value = value
  }

  /**
   * @param {unknown} source
   * @returns {The.Result<Record<Key, Value>, The.ConformanceError>}
   */
  conform(source) {
    const schema = this
    if (typeof source != 'object' || source === null || Array.isArray(source)) {
      return {
        error: kindError({
          schema,
          value: source,
        }),
      }
    }

    const { key, value } = this

    for (const [k, v] of Object.entries(source)) {
      const keyResult = key.conform(k)
      if (keyResult.error) {
        return {
          error: memberError({ schema, at: k, cause: keyResult.error }),
        }
      }

      const valueResult = value.conform(v)
      if (valueResult.error) {
        return {
          error: memberError({ schema, at: k, cause: valueResult.error }),
        }
      }
    }

    return { ok: /** @type {Record<Key, Value>} */ (source) }
  }

  /**
   * @param {Record<Key, Value>} view
   */
  encode(view) {
    return this.conform(view)
  }
  /**
   * @param {Record<Key, Value>} model
   */
  decode(model) {
    return this.conform(model)
  }

  /**
   * @returns {{
   *  map: {
   *    keyType: The.ToIPLDSchema<KeySchema>,
   *    valueType: The.ToIPLDSchema<ValueSchema>
   *    valueNullable: false
   *  }
   * }}
   */
  toJSON() {
    return {
      map: {
        keyType: /** @type {The.ToIPLDSchema<KeySchema>} */ (this.key.toJSON()),
        valueType: /** @type {The.ToIPLDSchema<ValueSchema>} */ (
          this.value.toJSON()
        ),
        valueNullable: false,
      },
    }
  }

  /**
   * @template {The.IPLD.MapType} MapType
   * @param {{ map: MapType }} json
   * @returns {The.Schema<The.TypeFromJSON<{ map: MapType }>>}
   */
  static fromJSON({ map }) {
    const key = map.keyType
      ? /** @type {The.Schema<string>} */ (fromJSON(map.keyType))
      : TheString
    const value = map.valueType ? fromJSON(map.valueType) : TheUnknown
    return /** @type {The.Schema<any>} */ (new MapSchema({ key, value }))
  }
}

/**
 * @template {string} Key
 * @template {unknown} Value
 * @param {object} source
 * @param {The.Schema<Key, unknown>} [source.key]
 * @param {The.Schema<Value, unknown>} [source.value]
 * @returns {The.Schema<Record<Key, Value>, Record<Key, Value>>}
 */
export const map = ({
  key = /** @type {The.Schema<Key, unknown>} */ (TheString),
  value = /** @type {The.Schema<Value, unknown>} */ (TheUnknown),
} = {}) => new MapSchema({ key, value })

class ConformanceError extends Error {
  /**
   * @param {object} input
   * @param {The.Schema} input.schema
   */
  constructor({ schema }) {
    super()
    this.schema = schema
  }
  get name() {
    return 'ConformanceError'
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

class KindError extends ConformanceError {
  /**
   * @param {object} input
   * @param {The.Schema} input.schema
   * @param {unknown} input.value
   */
  constructor({ schema, value }) {
    super({ schema })
    this.value = value
  }
  get name() {
    return 'KindError'
  }
  get expect() {
    const [kind] = match(this.schema.toJSON())
    switch (kind) {
      case 'bool':
        return 'boolean'
      case 'int':
        return 'integer'
      default:
        return kind
    }
  }
  get actual() {
    return displayTypeName(this.value)
  }
  describe() {
    return `Expected value of type ${this.expect} instead got ${this.actual}`
  }
}

/**
 * @param {object} source
 * @param {The.Schema} source.schema
 * @param {unknown} source.value
 * @returns {The.ConformanceError}
 */
export const kindError = source => new KindError(source)

/**
 * @param {object} options
 * @param {The.Schema} options.schema
 * @param {string|number} options.at
 * @param {The.ConformanceError} options.cause
 * @returns {The.ConformanceError}
 */
export const memberError = ({ schema, at, cause }) =>
  typeof at === 'string'
    ? new FieldError({ schema, at, cause })
    : new ElementError({ schema, at, cause })

class FieldError extends ConformanceError {
  /**
   * @param {object} source
   * @param {string} source.at
   * @param {The.ConformanceError} source.cause
   * @param {The.Schema} source.schema
   */
  constructor({ schema, at, cause }) {
    super({ schema })
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

class ElementError extends ConformanceError {
  /**
   * @param {object} source
   * @param {number} source.at
   * @param {The.ConformanceError} source.cause
   * @param {The.Schema} source.schema
   */
  constructor({ schema, at, cause }) {
    super({ schema })
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

/**
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

/**
 * @template {The.Variant} V
 * @param {V} variant
 * @returns {The.Branch<V>}
 */
const match = variant => {
  for (const branch in variant) {
    return /** @type {[keyof V, any]} */ ([branch, variant[branch]])
  }

  throw new Error(`Expected a variant but got unit`)
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

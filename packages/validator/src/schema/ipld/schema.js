import * as The from './api.js'

export * from './api.js'
export * as The from './api.js'

/**
 * @template {The.IPLD.Type} Type
 * @param {Type} json
 * @returns {The.Schema<The.TypeFromJSON<Type>>}
 */
export const fromJSON = json => {
  const [type, value] = match(/** @type {The.IPLD.Type} */ (json))
  switch (type) {
    case 'any':
      return /** @type {The.Schema<any>} */ (TheUnknown)
    case 'null':
      return /** @type {The.Schema<any>} */ (TheNull)
    case 'bool':
      return /** @type {The.Schema<any>} */ (TheBoolean)
    case 'string':
      return /** @type {The.Schema<any>} */ (TheString)
    case 'bytes':
      return /** @type {The.Schema<any>} */ (TheBytes)
    case 'int':
      return /** @type {The.Schema<any>} */ (Integer)
    case 'float':
      return /** @type {The.Schema<any>} */ (Float)
    case 'map':
      return /** @type {The.Schema<any>} */ (MapSchema.fromJSON({ map: value }))
    default:
      throw new Error(`Not implemented`)
  }
}

/**
 * @template T
 * @template U
 * @template {The.IPLD.Type} E
 * @implements {The.Schema<T|null, U|null, The.IPLD.NullableType<E>>}
 */
class Nullable {
  /**
   * @param {object} source
   * @param {The.Schema<T, U, E>} source.schema
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
   * @returns {The.Schema<T|null, U|null, The.IPLD.NullableType<E>>}
   */
  nullable() {
    return this
  }

  /**
   * @returns {The.IPLD.NullableType<E>}
   */
  toJSON() {
    const type = this.valueSchema.toJSON()
    return {
      union: {
        members: [TheNull.toJSON(), type],
        representation: {
          kinded: {
            Null: TheNull.toJSON(),
            Value: type,
          },
        },
      },
    }
  }
}

/**
 * @template T
 * @template U
 * @template {The.IPLD.Type} E
 * @param {The.Schema<T, U, E>} schema
 * @returns {The.Schema<T|null, U|null, The.IPLD.NullableType<E>>}
 */
export const nullable = schema => new Nullable({ schema })

/**
 * @implements {The.Schema<null, null, {null:The.IPLD.NullType }>}
 */
const NullSchema = class Null {
  /**
   * @param {unknown} source
   * @returns {The.Result<null, The.ConformanceError>}
   */
  conform(source) {
    if (source === null) {
      return { ok: null }
    } else {
      return kindError({ schema: TheNull, value: source })
    }
  }

  /**
   * @param {null} view
   */
  encode(view) {
    return this.conform(view)
  }

  /**
   * @param {null} model
   */
  decode(model) {
    return this.conform(model)
  }

  nullable() {
    return this
  }

  /**
   * @returns {{null:The.IPLD.NullType }}
   */
  toJSON() {
    return { null: {} }
  }
}

const TheNull = new NullSchema()
export const Null = TheNull

/**
 * @implements {The.Schema<unknown>}
 */
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

  nullable() {
    return nullable(this)
  }

  toJSON() {
    return { any: {} }
  }
}

const TheUnknown = new UnknownSchema()

export const unknown = () => TheUnknown

/**
 * @implements {The.Schema<boolean>}
 */
const BooleanSchema = class Boolean {
  /**
   * @param {unknown} input
   * @returns {The.Result<boolean, The.ConformanceError>}
   */
  conform(input) {
    switch (input) {
      case true:
      case false:
        return { ok: input }
      default:
        return kindError({ schema: TheBoolean, value: input })
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

  nullable() {
    return nullable(this)
  }

  toJSON() {
    return { bool: {} }
  }
}

const TheBoolean = new BooleanSchema()

export const Boolean = TheBoolean
export const boolean = () => Boolean

/**
 * @implements {The.Schema<string>}
 */
const StringSchema = class String {
  /**
   * @param {unknown} input
   * @returns {The.Result<string, The.ConformanceError>}
   */
  conform(input) {
    return typeof input === 'string'
      ? { ok: input }
      : kindError({ schema: TheString, value: input })
  }

  /**
   * @param {string} view
   */
  encode(view) {
    return this.conform(view)
  }

  nullable() {
    return nullable(this)
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

const TheString = new StringSchema()
export { TheString as String }
export const string = () => TheString

/**
 * @implements {The.Schema<Uint8Array>}
 */
const BytesSchema = class Bytes {
  /**
   * @param {unknown} input
   * @returns {The.Result<Uint8Array, The.ConformanceError>}
   */
  conform(input) {
    return input instanceof Uint8Array
      ? { ok: input }
      : kindError({ schema: TheBytes, value: input })
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

  nullable() {
    return nullable(this)
  }

  toJSON() {
    return { bytes: { representation: { bytes: {} } } }
  }
}

const TheBytes = new BytesSchema()
const Bytes = TheBytes
export const bytes = () => Bytes

/**
 * @implements {The.Schema<The.integer>}
 */
const IntegerSchema = class Integer {
  /**
   * @param {unknown} input
   * @returns {The.Result<The.integer, The.ConformanceError>}
   */
  conform(input) {
    return typeof input === 'number' && Number.isInteger(input)
      ? { ok: input }
      : kindError({ schema: this, value: input })
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

  nullable() {
    return nullable(this)
  }

  toJSON() {
    return { int: {} }
  }
}

export const Integer = new IntegerSchema()

export const integer = () => Integer

/**
 * @implements {The.Schema<The.float>}
 */
const FloatSchema = class FloatSchema {
  /**
   * @param {unknown} input
   * @returns {The.Result<The.float, The.ConformanceError>}
   */
  conform(input) {
    return typeof input === 'number' && Number.isFinite(input)
      ? { ok: input }
      : kindError({ schema: this, value: input })
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

  nullable() {
    return nullable(this)
  }

  toJSON() {
    return { float: {} }
  }
}

export const Float = new FloatSchema()
export const float = () => Float

/**
 * @template {string} KeyView
 * @template {string} KeyModel
 * @template {unknown} ValueView
 * @template {unknown} ValueModel
 * @template {The.IPLD.Type} [KeyType={string:The.IPLD.StringType}]
 * @template {The.IPLD.Type} [ValueType={any:The.IPLD.AnyType}]
 * @implements {The.Schema<Record<KeyView, ValueView>, Record<KeyModel, ValueModel>>}
 */
class MapSchema {
  /**
   * @param {object} settings
   * @param {The.Schema<KeyView, KeyModel, KeyType>} settings.key
   * @param {The.Schema<ValueView, ValueModel, ValueType>} settings.value
   */
  constructor({ key, value }) {
    this.key = key
    this.value = value
  }

  /**
   * @param {unknown} source
   * @returns {The.Result<Record<KeyView, ValueView>, The.ConformanceError>}
   */
  conform(source) {
    const schema = this
    if (typeof source != 'object' || source === null || Array.isArray(source)) {
      return kindError({
        schema,
        value: source,
      })
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

    return { ok: /** @type {Record<KeyView, ValueView>} */ (source) }
  }

  /**
   * @param {Record<KeyView, ValueView>} view
   * @returns {The.Result<Record<KeyModel, ValueModel>, The.ConformanceError>}
   */
  encode(view) {
    const schema = this
    if (typeof view != 'object' || view === null || Array.isArray(view)) {
      return kindError({
        schema,
        value: view,
      })
    }

    const model = /** @type {Record<KeyModel, ValueModel>} */ ({})
    const { key, value } = this

    for (const [k, v] of Object.entries(view)) {
      const keyResult = key.encode(/** @type {KeyView} */ (k))
      if (keyResult.error) {
        return {
          error: memberError({ schema, at: k, cause: keyResult.error }),
        }
      }

      const valueResult = value.encode(v)
      if (valueResult.error) {
        return {
          error: memberError({ schema, at: k, cause: valueResult.error }),
        }
      }

      model[keyResult.ok] = valueResult.ok
    }

    return { ok: model }
  }
  /**
   * @param {Record<KeyModel, ValueModel>} model
   */
  decode(model) {
    const schema = this
    if (typeof model != 'object' || model === null || Array.isArray(model)) {
      return kindError({
        schema,
        value: model,
      })
    }

    const view = /** @type {Record<KeyView, ValueView>} */ ({})
    const { key, value } = this

    for (const [k, v] of Object.entries(view)) {
      const keyResult = key.decode(/** @type {KeyModel} */ (k))
      if (keyResult.error) {
        return {
          error: memberError({ schema, at: k, cause: keyResult.error }),
        }
      }

      const valueResult = value.decode(v)
      if (valueResult.error) {
        return {
          error: memberError({ schema, at: k, cause: valueResult.error }),
        }
      }

      view[keyResult.ok] = valueResult.ok
    }

    return { ok: view }
  }

  /**
   * @returns {{
   *  map:
   *    ValueType extends The.IPLD.NullableType<infer T>
   *    ? { keyType: KeyType, valueType: T, valueNullable: true }
   *    : { keyType: KeyType, valueType: ValueType, valueNullable: false }
   * }}
   */
  toJSON() {
    const keyType = this.key.toJSON()
    const type = this.value.toJSON()

    const memberType =
      type.union &&
      type.union.representation.kinded &&
      type.union.members.length === 2 &&
      type.union.members[0].null &&
      type.union.members[1]

    const [valueType, valueNullable] = memberType
      ? [memberType, true]
      : [type, false]

    // @ts-expect-error
    return { map: { keyType, valueType, valueNullable } }
  }

  /**
   *
   * @returns {MapAsList<KeyView, KeyModel, ValueView, ValueModel, KeyType, ValueType>}
   */
  asList() {
    return new MapAsList({ schema: this })
  }

  /**
   * @template {string} Inner
   * @template {string} Entry
   * @param {object} options
   * @param {Inner} options.innerDelimiter
   * @param {Entry} options.entryDelimiter
   */
  asString({ innerDelimiter, entryDelimiter }) {
    return new MapAsString({ schema: this, innerDelimiter, entryDelimiter })
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
    const schema = new MapSchema({ key, value })

    if (map.representation) {
      const [type, value] = match(map.representation)
      switch (type) {
        case 'listpairs':
          return schema.asList()
        case 'stringpairs':
          return schema.asString()
        default:
          throw new Error(`Advanced layout are not supported`)
      }
    } else {
      return schema
    }
  }
}

/**
 * @template {string} KeyView
 * @template {string} KeyModel
 * @template {unknown} ValueView
 * @template {unknown} ValueModel
 * @template {The.IPLD.Type} [KeyType={string:The.IPLD.StringType}]
 * @template {The.IPLD.Type} [ValueType={any:The.IPLD.AnyType}]
 * @implements {The.Schema<Record<KeyView, ValueView>, [KeyModel, ValueModel][]>}
 */
class MapAsList {
  /**
   * @param {object} settings
   * @param {MapSchema<KeyView, KeyModel, ValueView, ValueModel, KeyType, ValueType>} settings.schema
   */
  constructor({ schema }) {
    this.schema = schema
  }

  /**
   * @param {unknown} source
   */
  conform(source) {
    return this.schema.conform(source)
  }

  /**
   * @param {Record<KeyView, ValueView>} view
   */
  encode(view) {
    const result = this.schema.encode(view)
    if (result.error) {
      return result
    } else {
      return {
        ok: /** @type {[KeyModel, ValueModel][]} */ (Object.entries(result.ok)),
      }
    }
  }

  /**
   * @param {[KeyModel, ValueModel][]} model
   */
  decode(model) {
    const schema = this
    if (!Array.isArray(model)) {
      return kindError({
        schema,
        value: model,
      })
    }

    const view = /** @type {Record<KeyView, ValueView>} */ ({})
    const { key, value } = this.schema

    for (const [at, [k, v]] of model.entries()) {
      const keyResult = key.decode(/** @type {KeyModel} */ (k))
      if (keyResult.error) {
        return {
          error: memberError({
            schema,
            at,
            cause: memberError({ schema, at: 0, cause: keyResult.error }),
          }),
        }
      }

      const valueResult = value.decode(v)
      if (valueResult.error) {
        return {
          error: memberError({
            schema,
            at,
            cause: memberError({ schema, at: 1, cause: valueResult.error }),
          }),
        }
      }

      view[keyResult.ok] = valueResult.ok
    }

    return { ok: view }
  }

  toJSON() {
    return {
      map: {
        ...this.schema.toJSON().map,
        representation: {
          listpairs: {},
        },
      },
    }
  }
}

/**
 * @template {string} KeyView
 * @template {string} KeyModel
 * @template {unknown} ValueView
 * @template {unknown} ValueModel
 * @template {string} Inner
 * @template {string} Entry
 * @template {The.IPLD.Type} [KeyType={string:The.IPLD.StringType}]
 * @template {The.IPLD.Type} [ValueType={any:The.IPLD.AnyType}]
 * @implements {The.Schema<Record<KeyView, ValueView>, `${string}`>}
 */
class MapAsString {
  /**
   * @param {object} settings
   * @param {Inner} settings.innerDelimiter
   * @param {Entry} settings.entryDelimiter
   * @param {MapSchema<KeyView, KeyModel, ValueView, ValueModel, KeyType, ValueType>} settings.schema
   */
  constructor({ schema, innerDelimiter, entryDelimiter }) {
    this.schema = schema
    this.innerDelimiter = innerDelimiter
    this.entryDelimiter = entryDelimiter
  }

  /**
   * @param {unknown} source
   */
  conform(source) {
    return this.schema.conform(source)
  }

  /**
   * @param {Record<KeyView, ValueView>} view
   */
  encode(view) {
    const result = this.schema.encode(view)
    if (result.error) {
      return result
    } else {
      const { innerDelimiter, entryDelimiter } = this
      const entries = []
      for (const [key, value] of Object.entries(result.ok)) {
        entries.push(`${key}${innerDelimiter}${value}`)
      }

      const ok =
        /** @type {`${string}${Inner}${string}`|`${string}${Inner}${string}${Entry}${string}`} */ (
          entries.join(entryDelimiter)
        )

      return { ok }
    }
  }

  /**
   * @param {string} model
   * @returns {The.Result<Record<KeyView, ValueView>, The.ConformanceError>}
   */
  decode(model) {
    const schema = this
    if (typeof model !== 'string') {
      return kindError({
        schema,
        value: model,
      })
    }

    const { entryDelimiter, innerDelimiter } = this
    const { key, value } = this.schema

    const view = /** @type {Record<KeyView, ValueView>} */ ({})
    const offset = 0
    for (const entry of model.split(entryDelimiter)) {
      const n = entry.indexOf(innerDelimiter)

      const [k, v] = [entry.slice(0, n), entry.slice(n + 1)]

      const keyResult = key.decode(/** @type {KeyModel} */ (k))
      if (keyResult.error) {
        return {
          error: memberError({
            schema,
            at: offset,
            cause: keyResult.error,
          }),
        }
      }

      const valueResult = value.decode(/** @type {ValueModel} */ (v))
      if (valueResult.error) {
        return {
          error: memberError({
            schema,
            at: offset + n + 1,
            cause: valueResult.error,
          }),
        }
      }

      view[keyResult.ok] = valueResult.ok
    }

    return { ok: view }
  }

  toJSON() {
    return {
      map: {
        ...this.schema.toJSON().map,
        representation: {
          stringpairs: {
            innerDelim: this.innerDelimiter,
            entryDelim: this.entryDelimiter,
          },
        },
      },
    }
  }
}

/**
 * @template {string} KeyView
 * @template ValueView
 * @template {string} KeyModel
 * @template {unknown} ValueModel
 * @template {The.IPLD.Type} [KeyType={string:The.IPLD.StringType}]
 * @template {The.IPLD.Type} [ValueType={any:The.IPLD.AnyType}]
 * @param {object} source
 * @param {The.Schema<KeyView, KeyModel, KeyType>} [source.key]
 * @param {The.Schema<ValueView, ValueModel, ValueType>} [source.value]
 */
export const map = ({
  key = /** @type {any} */ (TheString),
  value = /** @type {any} */ (TheUnknown),
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
 * @returns {{ error: The.ConformanceError }}
 */
export const kindError = source => ({
  error: new KindError(source),
})

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

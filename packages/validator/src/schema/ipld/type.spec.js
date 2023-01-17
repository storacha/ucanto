import * as Schema from './schema.js'

export const testBoolean = () => {
  const schema = Schema.fromJSON({
    bool: {},
  })

  /** @type {Schema.Result<boolean, Schema.ConformanceError>} */
  const a = schema.conform(0)

  /** @type {Schema.Result<number, Schema.ConformanceError>} */
  // @ts-expect-error
  const b = schema.conform(0)
}

export const testString = () => {
  const schema = Schema.fromJSON({
    string: {},
  })

  /** @type {Schema.Result<string, Schema.ConformanceError>} */
  const a = schema.conform(0)

  /** @type {Schema.Result<number, Schema.ConformanceError>} */
  // @ts-expect-error
  const b = schema.conform(0)
}

export const testBytes = () => {
  const schema = Schema.fromJSON({
    bytes: {},
  })

  /** @type {Schema.Result<Uint8Array, Schema.ConformanceError>} */
  const a = schema.conform(0)

  /** @type {Schema.Result<Uint16Array, Schema.ConformanceError>} */
  // @ts-expect-error
  const b = schema.conform(0)
}

export const testInt = () => {
  const schema = Schema.fromJSON({
    int: {},
  })

  /** @type {Schema.Result<Schema.The.integer, Schema.ConformanceError>} */
  const a = schema.conform(0)

  /** @type {Schema.Result<Schema.The.float, Schema.ConformanceError>} */
  // @ts-expect-error
  const b = schema.conform(NaN)
}

export const testFloat = () => {
  const schema = Schema.fromJSON({
    float: {},
  })

  /** @type {Schema.Result<Schema.The.float, Schema.ConformanceError>} */
  const a = schema.conform(0)

  /** @type {Schema.Result<Schema.The.integer, Schema.ConformanceError>} */
  // @ts-expect-error
  const b = schema.conform(NaN)
}

export const testMap = () => {
  const schema = Schema.fromJSON({
    map: {},
  })

  /** @type {Schema.Result<Record<string, unknown>>} */
  const t = schema.conform({})

  /** @type {Schema.Result<Record<string, Schema.The.float>>} */
  // @ts-expect-error
  const f = schema.conform({})
}

export const testMapKV = () => {
  const schema = Schema.fromJSON({
    map: {
      keyType: Schema.String.toJSON(),
      valueType: Schema.Integer.toJSON(),
      valueNullable: false,
    },
  })

  /** @type {Schema.Result<Record<string, Schema.The.integer>>} */
  const t = schema.conform({})

  /** @type {Schema.Result<Record<string, Schema.The.float>>} */
  // @ts-expect-error
  const f = schema.conform({})
}

export const testMapNullable = () => {
  const schema = Schema.fromJSON({
    map: {
      keyType: Schema.String.toJSON(),
      valueType: Schema.Integer.toJSON(),
      valueNullable: true,
    },
  })

  /** @type {Schema.Result<Record<string, Schema.The.integer|null>>} */
  const t = schema.conform({})

  /** @type {Schema.Result<Record<string, Schema.The.float>>} */
  // @ts-expect-error
  const f = schema.conform({})
}

export const testMapArray = () => {
  const schema = Schema.fromJSON({
    map: {
      keyType: Schema.String.toJSON(),
      valueType: Schema.Float.toJSON(),
      valueNullable: false,
      representation: { listpairs: {} },
    },
  })

  /** @type {Schema.Result<Array<[string, Schema.The.float]>>} */
  const t = schema.conform({})

  /** @type {Schema.Result<Array<[string, string]>>} */
  // @ts-expect-error
  const f = schema.conform({})
}

export const testMapNullableArray = () => {
  const schema = Schema.fromJSON({
    map: {
      keyType: Schema.String.toJSON(),
      valueType: Schema.Boolean.toJSON(),
      valueNullable: true,
      representation: { listpairs: {} },
    },
  })

  /** @type {Schema.Result<Array<[string, boolean|null]>>} */
  const t = schema.conform({})

  /** @type {Schema.Result<Array<[string, number|null]>>} */
  // @ts-expect-error
  const f = schema.conform({})
}

export const testMapStringPairs = () => {
  const schema = Schema.fromJSON({
    map: {
      keyType: Schema.String.toJSON(),
      valueType: Schema.Float.toJSON(),
      valueNullable: false,
      representation: {
        stringpairs: {
          innerDelim: /** @type {'='} */ ('='),
          entryDelim: /** @type {'&'} */ ('&'),
        },
      },
    },
  })

  /** @type {Schema.Result<``|`${string}=${string}`|`${string}=${string}&{string}`>} */
  const t = schema.conform({})
  /** @type {Schema.Result<string>} */
  const t2 = schema.conform({})

  /** @type {Schema.Result<`hello`>} */
  // @ts-expect-error
  const f = schema.conform({})
}

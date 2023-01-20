import { test, assert } from '../../../test/test.js'
import * as Schema from './schema.js'

const utf8 = new TextEncoder()

test('fromJSON({ bool: {} })', () => {
  const schema = Schema.fromJSON({
    bool: {},
  })

  assert.deepEqual(schema.conform(true), { ok: true })
  assert.deepEqual(schema.conform(false), { ok: false })

  assert.containSubset(schema.conform(null), {
    error: {
      name: 'KindError',
      schema: Schema.boolean,
      message: `Expected value of type boolean instead got null`,
    },
  })

  assert.deepEqual(schema.toJSON(), { bool: {} })
})

test('fromJSON({ string: {} })', () => {
  const schema = Schema.fromJSON({
    string: {},
  })

  assert.deepEqual(schema.conform('hello'), { ok: 'hello' })

  assert.containSubset(schema.conform(new String('hello')), {
    error: {
      name: 'KindError',
      message: `Expected value of type string instead got object`,
    },
  })

  assert.deepEqual(schema.toJSON(), {
    string: {},
  })
})

test('fromJSON({ bytes: {} })', () => {
  const schema = Schema.fromJSON({
    bytes: {},
  })

  const bytes = utf8.encode('hello world')
  assert.deepEqual(schema.conform(bytes), { ok: bytes })

  assert.containSubset(schema.conform('hello'), {
    error: {
      name: 'KindError',
      message: `Expected value of type bytes instead got "hello"`,
    },
  })

  assert.containSubset(schema.conform(new Uint16Array(bytes)), {
    error: {
      name: 'KindError',
      message: `Expected value of type bytes instead got object`,
    },
  })

  assert.deepEqual(schema.toJSON(), {
    bytes: { representation: { bytes: {} } },
  })
})

test('fromJSON({ int: {} })', () => {
  const schema = Schema.fromJSON({
    int: {},
  })

  assert.deepEqual(schema.conform(2), { ok: 2 })
  assert.deepEqual(schema.conform(-8), { ok: -8 })
  assert.deepEqual(schema.conform(0), { ok: 0 })

  assert.containSubset(schema.conform('hello'), {
    error: {
      name: 'KindError',
      message: `Expected value of type integer instead got "hello"`,
    },
  })

  assert.containSubset(schema.conform(NaN), {
    error: {
      name: 'KindError',
      message: `Expected value of type integer instead got NaN`,
    },
  })

  assert.containSubset(schema.conform(Infinity), {
    error: {
      name: 'KindError',
      message: `Expected value of type integer instead got Infinity`,
    },
  })

  assert.containSubset(schema.conform(0.3), {
    error: {
      name: 'KindError',
      message: `Expected value of type integer instead got 0.3`,
    },
  })

  assert.deepEqual(schema.toJSON(), {
    int: {},
  })
})

test('fromJSON({ float: {} })', () => {
  const schema = Schema.fromJSON({
    float: {},
  })

  assert.deepEqual(schema.conform(2), { ok: 2 })
  assert.deepEqual(schema.conform(-8), { ok: -8 })
  assert.deepEqual(schema.conform(0), { ok: 0 })
  assert.deepEqual(schema.conform(0.4), { ok: 0.4 })
  assert.deepEqual(schema.conform(-0.7), { ok: -0.7 })

  assert.containSubset(schema.conform(new Number(2)), {
    error: {
      name: 'KindError',
      message: `Expected value of type float instead got object`,
    },
  })

  assert.containSubset(schema.conform(NaN), {
    error: {
      name: 'KindError',
      message: `Expected value of type float instead got NaN`,
    },
  })

  assert.containSubset(schema.conform(Infinity), {
    error: {
      name: 'KindError',
      message: `Expected value of type float instead got Infinity`,
    },
  })

  assert.deepEqual(schema.toJSON(), {
    float: {},
  })
})

test('fromJSON({ map: {} })', () => {
  const schema = Schema.fromJSON({
    map: {},
  })

  assert.deepEqual(schema.toJSON(), {
    map: {
      keyType: { string: {} },
      valueType: { any: {} },
      valueNullable: false,
    },
  })

  const source = { x: 1, y: 2, other: 'test' }
  assert.equal(schema.conform(source).ok, source)

  const blank = {}
  assert.equal(schema.conform(blank).ok, blank)

  assert.containSubset(schema.conform([]), {
    error: {
      name: 'KindError',
      message: `Expected value of type map instead got array`,
    },
  })
})

test('Schema.map()', () => {
  const schema = Schema.map()

  assert.deepEqual(schema.toJSON(), {
    map: {
      keyType: { string: {} },
      valueType: { any: {} },
      valueNullable: false,
    },
  })

  const source = { x: 1, y: 2, other: 'test' }
  assert.equal(schema.conform(source).ok, source)

  const blank = {}
  assert.equal(schema.conform(blank).ok, blank)

  assert.containSubset(schema.conform([]), {
    error: {
      name: 'KindError',
      message: `Expected value of type map instead got array`,
    },
  })
})

test('Schema.map({ value: Schema.integer() })', () => {
  const schema = Schema.map({
    value: Schema.integer(),
  })

  assert.deepEqual(
    Schema.fromJSON({
      map: {
        valueType: { int: {} },
      },
    }),
    schema
  )

  assert.deepEqual(schema.toJSON(), {
    map: {
      keyType: { string: {} },
      valueType: { int: {} },
      valueNullable: false,
    },
  })

  const source = { x: 1, y: 2 }
  assert.equal(schema.conform(source).ok, source)

  assert.containSubset(schema.conform({ x: 1, y: 2, z: '3' }), {
    error: {
      name: 'FieldError',
      message: `Object contains invalid field "z":
  - Expected value of type integer instead got "3"`,
    },
  })

  assert.containSubset(schema.conform({ x: 1, y: 2, z: undefined }), {
    error: {
      name: 'FieldError',
      message: `Object contains invalid field "z":
  - Expected value of type integer instead got undefined`,
    },
  })

  assert.containSubset(schema.conform({ x: 1, y: 2, z: null }), {
    error: {
      name: 'FieldError',
      message: `Object contains invalid field "z":
  - Expected value of type integer instead got null`,
    },
  })
})

test('Schema.map({ value: Schema.integer().nullable()', () => {
  const schema = Schema.map({
    value: Schema.integer().nullable(),
  })

  assert.deepEqual(schema.toJSON(), {
    map: {
      keyType: { string: {} },
      valueType: { int: {} },
      valueNullable: true,
    },
  })
})

test('Schema.map({ value: Schema.integer().nullable() }).asList()', () => {
  const schema = Schema.map({
    value: Schema.integer().nullable(),
  }).asList()

  assert.deepEqual(schema.encode({ x: 1, y: 2, z: null }), {
    ok: [
      ['x', 1],
      ['y', 2],
      ['z', null],
    ],
  })

  assert.deepEqual(
    schema.decode([
      ['x', 1],
      ['y', 2],
      ['z', null],
    ]),
    {
      ok: {
        x: 1,
        y: 2,
        z: null,
      },
    }
  )

  assert.deepEqual(schema.toJSON(), {
    map: {
      keyType: { string: {} },
      valueType: { int: {} },
      valueNullable: true,
      representation: {
        listpairs: {},
      },
    },
  })
})

test('Schema.map({ value: Schema.string() }).asString({ .. })', () => {
  const schema = Schema.map({
    value: Schema.string(),
  }).asString({
    innerDelimiter: '=',
    entryDelimiter: '&',
  })

  assert.deepEqual(schema.encode({ x: '1', y: '2' }), {
    ok: `x=1&y=2`,
  })

  assert.deepEqual(schema.decode(`x=1&y=2`), {
    ok: {
      x: '1',
      y: '2',
    },
  })

  assert.deepEqual(schema.toJSON(), {
    map: {
      keyType: { string: {} },
      valueType: { string: {} },
      valueNullable: false,
      representation: {
        stringpairs: {
          innerDelim: '=',
          entryDelim: '&',
        },
      },
    },
  })
})

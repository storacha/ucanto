import * as Schema from '../src/schema.js'
import { test, assert } from './test.js'

const Shapes = Schema.variant({
  circe: Schema.struct({ radius: Schema.number() }),
  rectangle: Schema.struct({
    width: Schema.number(),
    height: Schema.number(),
  }),
})

test('variant', () => {
  assert.deepEqual(Shapes.read({ circe: { radius: 1 } }), {
    ok: {
      circe: { radius: 1 },
    },
  })

  assert.deepEqual(Shapes.read({ rectangle: { width: 1, height: 2 } }), {
    ok: {
      rectangle: { width: 1, height: 2 },
    },
  })

  assert.containSubset(Shapes.read({ rectangle: { width: 1 } }), {
    error: {
      message: `Object contains invalid field "rectangle":
  - Object contains invalid field "height":
    - Expected value of type number instead got undefined`,
      at: 'rectangle',
    },
  })

  assert.containSubset(Shapes.read({ square: { width: 5 } }), {
    error: {
      message: `Expected an object with one of the these keys: circe, rectangle instead got object with key square`,
    },
  })

  assert.containSubset(Shapes.read([]), {
    error: {
      message: `Expected value of type object instead got array`,
    },
  })
})

test('variant can not have extra fields', () => {
  assert.containSubset(
    Shapes.read({ rectangle: { width: 1, height: 2 }, circle: { radius: 3 } }),
    {
      error: {
        message: `Expected an object with a single key instead got object with keys circle, rectangle`,
      },
    }
  )
})

test('variant with default match', () => {
  const Shapes = Schema.variant({
    circe: Schema.struct({ radius: Schema.number() }),
    rectangle: Schema.struct({
      width: Schema.number(),
      height: Schema.number(),
    }),

    _: Schema.dictionary({ value: Schema.unknown() }),
  })

  assert.deepEqual(Shapes.read({ circe: { radius: 1 } }), {
    ok: { circe: { radius: 1 } },
  })

  assert.deepEqual(Shapes.read({ rectangle: { width: 10, height: 7 } }), {
    ok: {
      rectangle: { width: 10, height: 7 },
    },
  })

  assert.deepEqual(Shapes.read({ square: { width: 5 } }), {
    ok: { _: { square: { width: 5 } } },
  })
})

test('variant with default', () => {
  const Shapes = Schema.variant({
    circe: Schema.struct({ radius: Schema.number() }),
    rectangle: Schema.struct({
      width: Schema.number(),
      height: Schema.number(),
    }),

    _: Schema.struct({
      isShape: Schema.boolean(),
    }),
  })

  assert.deepEqual(Shapes.read({ circe: { radius: 1 } }), {
    ok: { circe: { radius: 1 } },
  })

  assert.deepEqual(Shapes.read({ rectangle: { width: 10, height: 7 } }), {
    ok: {
      rectangle: { width: 10, height: 7 },
    },
  })

  assert.deepEqual(Shapes.read({ isShape: true }), {
    ok: {
      _: {
        isShape: true,
      },
    },
  })

  assert.containSubset(Shapes.read({ square: { width: 5 } }), {
    error: {
      name: 'FieldError',
      message: `Object contains invalid field "isShape":
  - Expected value of type boolean instead got undefined`,
    },
  })
})

test('variant match', () => {
  const Shapes = Schema.variant({
    circe: Schema.struct({ radius: Schema.number() }),
    rectangle: Schema.struct({
      width: Schema.number(),
      height: Schema.number(),
    }),

    _: Schema.dictionary({
      value: Schema.unknown(),
    }),
  })

  assert.deepEqual(Shapes.match({ circe: { radius: 1 } }), [
    'circe',
    { radius: 1 },
  ])

  assert.deepEqual(Shapes.match({ square: { width: 5 } }), [
    '_',
    { square: { width: 5 } },
  ])

  assert.throws(
    () => Shapes.match([]),
    /Expected value of type object instead got array/
  )

  assert.deepEqual(Shapes.match([], { whatever: 1 }), [
    null,
    {
      whatever: 1,
    },
  ])
})

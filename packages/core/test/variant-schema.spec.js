import * as Schema from '../src/schema.js'
import { test, assert, matchError } from './test.js'

const Shape = Schema.variant({
  circle: Schema.struct({ radius: Schema.number() }),
  rectangle: Schema.struct({
    width: Schema.number(),
    height: Schema.number(),
  }),
})

test('variant', () => {
  assert.deepEqual(Shape.read({ circle: { radius: 1 } }), {
    ok: {
      circle: { radius: 1 },
    },
  })

  assert.deepEqual(Shape.read({ rectangle: { width: 1, height: 2 } }), {
    ok: {
      rectangle: { width: 1, height: 2 },
    },
  })

  matchError(
    Shape.read({ rectangle: { width: 1 } }),
    /contains invalid field "rectangle"/
  )

  matchError(
    Shape.read({ square: { width: 5 } }),
    /Expected an object with one of the these keys: circle, rectangle instead got object with key square/
  )

  matchError(Shape.read([]), /Expected value of type object instead got array/)
})

test('variant can not have extra fields', () => {
  matchError(
    Shape.read({ rectangle: { width: 1, height: 2 }, circle: { radius: 3 } }),
    /Expected an object with a single key instead got object with keys circle, rectangle/
  )
})

test('variant with default match', () => {
  const Shapes = Schema.variant({
    circle: Schema.struct({ radius: Schema.number() }),
    rectangle: Schema.struct({
      width: Schema.number(),
      height: Schema.number(),
    }),

    _: Schema.dictionary({ value: Schema.unknown() }),
  })

  assert.deepEqual(Shapes.read({ circle: { radius: 1 } }), {
    ok: { circle: { radius: 1 } },
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
    circle: Schema.struct({ radius: Schema.number() }),
    rectangle: Schema.struct({
      width: Schema.number(),
      height: Schema.number(),
    }),

    _: Schema.struct({
      isShape: Schema.boolean(),
    }),
  })

  assert.deepEqual(Shapes.read({ circle: { radius: 1 } }), {
    ok: { circle: { radius: 1 } },
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

  matchError(Shapes.read({ square: { width: 5 } }), /isShape/)
})

test('variant match', () => {
  const Shapes = Schema.variant({
    circle: Schema.struct({ radius: Schema.number() }),
    rectangle: Schema.struct({
      width: Schema.number(),
      height: Schema.number(),
    }),

    _: Schema.dictionary({
      value: Schema.unknown(),
    }),
  })

  assert.deepEqual(Shapes.match({ circle: { radius: 1 } }), [
    'circle',
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

test('variant create', () => {
  const shape = Shape.create({ circle: { radius: 1 } })
  assert.deepEqual(shape, { circle: { radius: 1 } })

  assert.throws(
    () =>
      Shape.create(
        // @ts-expect-error - does not match schema
        { square: { width: 5 } }
      ),
    /object with one of the these keys: circle, rectangle instead got object with key square/
  )
})

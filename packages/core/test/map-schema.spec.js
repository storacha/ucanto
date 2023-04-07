import * as Schema from '../src/schema.js'
import { test, assert } from './test.js'

test('.partial on structs', () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const PartialPoint = Point.partial()

  assert.deepEqual(PartialPoint.shape, {
    x: Schema.integer().optional(),
    y: Schema.integer().optional(),
  })

  assert.deepEqual(PartialPoint.from({}), {})
  assert.deepEqual(PartialPoint.from({ x: 1 }), { x: 1 })
  assert.deepEqual(PartialPoint.from({ x: 1, y: 2 }), { x: 1, y: 2 })
  assert.deepEqual(PartialPoint.from({ y: 2 }), { y: 2 })
  assert.deepEqual(PartialPoint.from({ x: undefined }), {})
  assert.deepEqual(PartialPoint.from({ x: undefined, y: 2 }), { y: 2 })

  assert.throws(
    () =>
      // @ts-expect-error - should complain about no argument
      Point.create(),
    /invalid field/
  )

  assert.deepEqual(PartialPoint.create(), {})
})

test('.partial on dicts', () => {
  const Ints = Schema.dictionary({ value: Schema.integer() })
  const IntsMaybe = Ints.partial()

  assert.equal(IntsMaybe.key, Ints.key)
  assert.deepEqual(IntsMaybe.value, Schema.integer().optional())

  assert.deepEqual(IntsMaybe.from({}), {})
  assert.deepEqual(IntsMaybe.from({ x: 1 }), { x: 1 })
  assert.deepEqual(IntsMaybe.from({ x: 1, y: 2 }), { x: 1, y: 2 })
  assert.deepEqual(IntsMaybe.from({ y: 2 }), { y: 2 })
  assert.deepEqual(IntsMaybe.from({ x: undefined }), {})
  assert.deepEqual(IntsMaybe.from({ x: undefined, y: 2 }), { y: 2 })
})

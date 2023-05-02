import * as Schema from '../src/schema.js'
import { CBOR } from '../src/dag.js'
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

test('.creteIPLDView', async () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const view = await Point.toIPLDBuilder({
    x: 1,
    y: 2,
  }).ok?.buildIPLDView()

  if (!view) {
    return assert.fail('view is undefined')
  }

  const store = new Map()
  store.set(`${view.link()}`, view.root)

  const point = Point.toIPLDView({
    link: view.link(),
    store,
  }).ok

  if (!point) {
    return assert.fail('point is undefined')
  }

  assert.equal(point.x, 1)
  assert.equal(point.y, 2)

  const blocks = [...point.iterateIPLDBlocks()]
  assert.deepEqual(blocks, [view.root])
  assert.equal(
    // @ts-expect-error - not specified in type
    point.buildIPLDView(),
    point
  )
})

test('.toIPLDBuilder fails with bad input', async () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const builder = await Point.toIPLDBuilder({
    x: 1,
  })

  assert.match(builder.error?.message || '', /invalid field "y"/)
})

test('invalid views', async () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const block = await CBOR.write({ x: 1, z: 3 })
  const store = new Map([[`${block.cid}`, block]])

  const point = Point.toIPLDView({ link: block.cid, store }).ok
  if (!point) {
    return assert.fail('point is undefined')
  }
  assert.equal(point.x, 1)

  assert.throws(() => point.y, /invalid field "y"/)
})

test('toIPLDView fails if block is not found', async () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const block = await CBOR.write({ x: 1, y: 3 })
  const store = new Map()
  const point = Point.toIPLDView({ link: block.cid, store })
  assert.equal(point.error?.message, `Missing block ${block.cid}`)
})

test('toIPLDView fails with incompatible block', async () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const block = await CBOR.write([{ x: 1, y: 3 }])
  const store = new Map([[`${block.cid}`, block]])
  const point = Point.toIPLDView({ link: block.cid, store })
  assert.equal(
    point.error?.message,
    `Expected value of type object instead got array`
  )
})

test('toIPLDView on non-struct', async () => {
  const Points = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  }).array()

  const block = await CBOR.write([
    { x: 0, y: 0 },
    { x: 16, y: 17 },
  ])
  const store = new Map([[`${block.cid}`, block]])

  const points = Points.toIPLDView({ link: block.cid, store })
  assert.ok(points.ok)
  assert.deepEqual(points.ok?.root.data, [
    { x: 0, y: 0 },
    { x: 16, y: 17 },
  ])
})

test('toIPLDView on invalid content', async () => {
  const Points = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  }).array()

  const block = await CBOR.write({ x: 0, y: 0 })
  const store = new Map([[`${block.cid}`, block]])

  const points = Points.toIPLDView({ link: block.cid, store })
  assert.equal(
    points.error?.message,
    'Expected value of type array instead got object'
  )
})

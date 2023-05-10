import * as Schema from '../src/schema.js'
import { isLink, parseLink } from '../src/lib.js'
import { CBOR, identity, sha256, createStore, writeInto } from '../src/dag.js'
import { test, assert } from './test.js'

describe.only('IPLD Schema', () => {
  test('link schema', async () => {
    const Point = Schema.struct({
      x: Schema.integer(),
      y: Schema.integer(),
    })

    const PointLink = Point.link({ codec: CBOR })

    assert.equal(
      PointLink.tryFrom(parseLink('bafkqaaa')).error?.message,
      'Expected link to be CID with 0x71 codec'
    )

    const onlyX = await CBOR.write({ x: 1 })
    const onlyXLink = await PointLink.from(
      // @ts-expect-error - does not have y
      onlyX.cid
    )
    assert.ok(onlyX)

    assert.deepEqual(
      onlyX.cid.toString(),
      onlyXLink.link().toString(),
      'links match'
    )

    assert.throws(
      () => onlyXLink.resolve(new Map()),
      'Block can not be resolved, please provide a store from which to resolve it'
    )

    assert.throws(
      () => onlyXLink.resolve(new Map([[onlyX.cid.toString(), onlyX]])),
      /invalid field "y"/
    )

    const point = await CBOR.write({ x: 1, y: 2 })
    const pointLink = await PointLink.from(point.cid)

    equalLink(point.cid, pointLink)

    assert.throws(
      () => pointLink.resolve(new Map()),
      'Block can not be resolved, please provide a store from which to resolve it'
    )

    assert.deepEqual(
      pointLink.resolve(new Map([[point.cid.toString(), point]])),
      {
        x: 1,
        y: 2,
      }
    )

    const view = pointLink.select(new Map([[point.cid.toString(), point]]))
    equalLink(view, point.cid)

    assert.deepEqual(view.resolve(), { x: 1, y: 2 })

    assert.equal(isLink(PointLink.from(view)), true)
    equalLink(PointLink.from(view), point.cid)

    const p2 = await PointLink.attach({
      x: 1,
      y: 2,
    })

    assert.deepEqual(p2.link(), point.cid)
    assert.deepEqual(p2.root.bytes, point.bytes)
  })

  test('embed links', async () => {
    const Point = Schema.struct({
      x: Schema.integer(),
      y: Schema.integer(),
    })

    const Line = Schema.struct({
      start: Point.link({ codec: CBOR }),
      end: Point.link({ codec: CBOR }).attached(),
    })

    const PointLink = Point.link({ codec: CBOR })

    const line = Line.from({
      start: PointLink.embed({
        x: 1,
        y: 2,
      }),
      end: PointLink.embed({
        x: 0,
        y: 0,
      }),
    })

    assert.ok(isLink(line.start), 'is a link')
    assert.ok(isLink(line.end), 'is a link')
    assert.equal(line.start.code, CBOR.code, 'is a CBOR link')
    assert.equal(line.start.multihash.code, identity.code, 'is a CBOR link')

    assert.deepEqual(line.start.resolve(new Map()), { x: 1, y: 2 })
    assert.deepEqual(line.end.resolve(), { x: 0, y: 0 })
  })

  test('attached links', async () => {
    const Point = Schema.struct({
      x: Schema.integer(),
      y: Schema.integer(),
    })

    const Line = Schema.struct({
      start: Point.link({ codec: CBOR }).attached(),
      end: Point.link({ codec: CBOR }).attached(),
    })

    const int = Schema.integer()
    const store = createStore()
    const start = await writeInto({ x: int.from(0), y: int.from(0) }, store)
    const end = await writeInto({ x: int.from(7), y: int.from(8) }, store)
    const line = await writeInto({ start: start.cid, end: end.cid }, store)

    const Root = Line.link({ codec: CBOR })

    const root = Root.parse(line.cid.toString())

    {
      const line = root.resolve(store)

      assert.equal(line.start.resolve().x, 0)
      assert.equal(line.start.resolve().y, 0)
      assert.equal(line.end.resolve().x, 7)
      assert.equal(line.end.resolve().y, 8)
    }

    const PointLink = Point.link({ codec: CBOR })

    {
      const line = Line.from({
        start: PointLink.embed({ x: 0, y: 0 }),
        end: await PointLink.attach({
          x: 1,
          y: 2,
        }),
      })

      assert.equal(line.start.code, CBOR.code)
      assert.equal(line.start.multihash.code, identity.code)
      assert.equal(line.end.code, CBOR.code)
      assert.equal(line.end.multihash.code, sha256.code)
    }
  })

  test('read from archive', async () => {
    const Point = Schema.struct({
      x: Schema.integer(),
      y: Schema.integer(),
    })

    const Line = Schema.struct({
      start: Point.link({ codec: CBOR }).attached(),
      end: Point.link({ codec: CBOR }).attached(),
    })

    const int = Schema.integer()
    const archive = createStore()
    const start = await writeInto({ x: int.from(0), y: int.from(0) }, archive)
    const end = await writeInto({ x: int.from(7), y: int.from(8) }, archive)
    const root = await writeInto({ start: start.cid, end: end.cid }, archive)

    const Root = Line.link({ codec: CBOR })

    const line = Root.parse(root.cid.toString()).resolve(archive)
    assert.deepEqual(line.start.resolve(), { x: 0, y: 0 })
    assert.deepEqual(line.end.resolve(), { x: 7, y: 8 })
  })

  test('build dag', async () => {
    const Point = Schema.struct({
      x: Schema.integer(),
      y: Schema.integer(),
    })

    const Line = Schema.struct({
      start: Point.link({ codec: CBOR }).attached(),
      end: Point.link({ codec: CBOR }).attached(),
    })

    const start = await Point.link({ codec: CBOR }).attach({
      x: 1,
      y: 2,
    })

    const CBORPoint = Point.link({ codec: CBOR })
    const end = await Point.link({ codec: CBOR }).attach({
      x: 3,
      y: 4,
    })

    const PointLink = Point.link({ codec: CBOR })
    const PointAttachment = PointLink.attached()

    const BoxedPoint = Schema.struct({
      point: Point.link({ codec: CBOR }).attached(),
    })

    BoxedPoint.from({ point: await PointLink.attach({ x: 1, y: 2 }) })
    const BoxedPointLink = BoxedPoint.link({ codec: CBOR })

    BoxedPointLink.embed({
      point: PointLink.embed({ x: 1, y: 2 }),
    })

    PointAttachment.from

    const point = await PointLink.attach({
      x: 1,
      y: 2,
    })

    assert.deepEqual(point.resolve(), { x: 1, y: 2 })

    const lineEmbed = await Line.link({ codec: CBOR }).attach({
      start: point,
      end: point,
    })

    const embed = lineEmbed.resolve()
    assert.deepEqual(embed.start.link(), point.link())
    assert.deepEqual(embed.start.resolve(), { x: 1, y: 2 })
    assert.deepEqual(embed.end.link(), point.link())
    assert.deepEqual(embed.end.resolve(), { x: 1, y: 2 })

    const blocks = Object.fromEntries(
      [...lineEmbed.iterateIPLDBlocks()].map(block => [`${block.cid}`, block])
    )

    assert.ok(blocks[lineEmbed.link().toString()])
    assert.ok(blocks[point.link().toString()])
  })

  test('array of dags', async () => {
    const Point = Schema.struct({
      x: Schema.integer(),
      y: Schema.integer(),
    })

    const Polygon = Schema.array(Point.link({ codec: CBOR }).attached())

    const polygon = await Polygon.link({ codec: CBOR }).attach([
      await Polygon.element.attach({ x: 1, y: 2 }),
      await Polygon.element.attach({ x: 3, y: 4 }),
      await Polygon.element.attach({ x: 5, y: 6 }),
    ])

    const compile = async (data = {}) => {
      const { bytes, cid } = await CBOR.write(data)
      return { bytes, cid, data }
    }

    const link = async (data = {}) => {
      const { cid } = await CBOR.write(data)
      return cid
    }

    assert.deepEqual(
      [...polygon.iterateIPLDBlocks()],
      [
        await compile({ x: 1, y: 2 }),
        await compile({ x: 3, y: 4 }),
        await compile({ x: 5, y: 6 }),
        polygon.root,
      ]
    )

    assert.deepEqual(
      polygon.link(),
      await link([
        await link({ x: 1, y: 2 }),
        await link({ x: 3, y: 4 }),
        await link({ x: 5, y: 6 }),
      ])
    )

    const region = new Map(
      [...polygon.iterateIPLDBlocks()].map(block => [`${block.cid}`, block])
    )

    const root = Polygon.link({ codec: CBOR })
      .parse(polygon.link().toString())
      .select(region)

    const replica = root.resolve()

    assert.deepEqual(replica, [
      await link({ x: 1, y: 2 }),
      await link({ x: 3, y: 4 }),
      await link({ x: 5, y: 6 }),
    ])

    assert.deepEqual(replica[0].resolve(), { x: 1, y: 2 })
    assert.deepEqual(replica[0].resolve(), { x: 3, y: 4 })
    assert.deepEqual(replica[0].resolve(), { x: 5, y: 6 })
  })
})

/**
 *
 * @param {Schema.UnknownLink} actual
 * @param {Schema.UnknownLink} expected
 */
const equalLink = (actual, expected) =>
  assert.deepEqual(CBOR.encode(actual), CBOR.encode(expected))

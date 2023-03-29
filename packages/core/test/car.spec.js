import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import * as CBOR from '../src/cbor.js'
import { isLink } from '../src/lib.js'

test('encode <-> decode', async () => {
  const root = await CBOR.write({ hello: 'world ' })
  const block = await CBOR.write({ bye: 'world ' })
  const store = new Map([[block.cid.toString(), block]])

  const bytes = CAR.encode({
    roots: [root],
    blocks: store,
  })
  const { blocks, roots } = await CAR.decode(bytes)
  assert.equal(blocks.size, 2)
  assert.deepEqual(roots, [root])
  assert.deepEqual(blocks.get(root.cid.toString()), root)
  assert.deepEqual(blocks.get(block.cid.toString()), block)

  const car = await CAR.write({ roots: [root], blocks: store })
  assert.deepEqual(car.bytes, bytes)
  assert.equal(isLink(car.cid), true)

  const link = await CAR.link(car.bytes)
  assert.deepEqual(car.cid, link)
})

test('car writer', async () => {
  const hello = await CBOR.write({ hello: 'world ' })
  const writer = CAR.createWriter()
  writer.write(hello)
  const bytes = writer.flush()

  const car = await CAR.decode(bytes)
  assert.deepEqual(car.roots, [])
  assert.deepEqual([...car.blocks], [[hello.cid.toString(), hello]])
})

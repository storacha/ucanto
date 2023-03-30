import { test, assert } from './test.js'
import * as CBOR from '../src/cbor.js'
import * as CAR from '../src/car.js'
import * as DAG from '../src/dag.js'
import { isLink } from '../src/link.js'
import { identity } from 'multiformats/hashes/identity'

test('DAG.get', async () => {
  const store = DAG.createStore()
  const { data, ...foo } = await DAG.writeInto({ foo: 'bar' }, store)

  assert.deepEqual(DAG.get(foo.cid, store), foo)
})

test('DAG.get throws if fallback is not passed', async () => {
  const store = DAG.createStore()
  const block = await CBOR.write({ foo: 'bar' })
  assert.throws(
    () => DAG.get(block.cid, store),
    `Block for the ${block.cid} is not found`
  )

  assert.deepEqual(DAG.get(block.cid, store, null), null)
  assert.deepEqual(DAG.get(block.cid, store, 'hello'), 'hello')

  DAG.addInto(block, store)

  assert.deepEqual(DAG.get(block.cid, store), block)
})

test('DAG.embed / DAG.get', async () => {
  const store = DAG.createStore()
  const cbor = DAG.embed({ hello: 'world' })

  assert.equal(isLink(cbor.cid), true)
  assert.equal(cbor.cid.code, CBOR.code)
  assert.equal(cbor.cid.version, 1)
  assert.equal(cbor.cid.multihash.code, identity.code)

  assert.deepEqual(DAG.get(cbor.cid, store), {
    cid: cbor.cid,
    bytes: CBOR.encode({ hello: 'world' }),
  })

  const block = await CBOR.write({ hello: 'world' })

  const car = DAG.embed({ roots: [block] }, { codec: CAR })
  assert.equal(isLink(car.cid), true)
  assert.equal(car.cid.code, CAR.code)
  assert.equal(car.cid.version, 1)
  assert.equal(car.cid.multihash.code, identity.code)

  assert.deepEqual(DAG.get(car.cid, store), {
    cid: car.cid,
    bytes: CAR.encode({ roots: [block] }),
  })
})

import { test, assert } from './test.js'
import * as CBOR from '../src/cbor.js'
import { decode, encode } from '@ipld/dag-cbor'

test('encode / decode', async () => {
  const bytes = CBOR.encode([{ ok: true, value: 1 }])

  assert.deepEqual(bytes, encode([{ ok: true, value: 1 }]))

  assert.deepEqual(await CBOR.decode(bytes), [{ ok: true, value: 1 }])
})

{
  const { encode, decode, write } = CBOR

  /**
   * @template T
   * @param {T} value
   */
  const transcode = value => decode(encode(value))

  const dataset = [
    undefined,
    null,
    Symbol('hello'),
    [1, , 3],
    { x: 1, y: undefined },
    { x: 3, p: Symbol('hi') },
    {
      x: 1,
      y: 2,
      toJSON() {
        return [1, 2]
      },
    },
  ]

  for (const data of dataset) {
    test(`encode / decode ${JSON.stringify(data)}`, async () => {
      const actual = transcode(data)
      const expect = JSON.parse(JSON.stringify(data) || 'null')
      assert.deepEqual(actual, expect)
    })
  }

  test(`encode / decode bytes`, async () => {
    const UTF8 = new TextEncoder()
    const actual = transcode({ bytes: UTF8.encode('hello') })
    assert.deepEqual(actual, { bytes: UTF8.encode('hello') })
  })

  test('circular objects throw', () => {
    const circular = { a: 1, circle: {} }
    circular.circle = circular

    const nested = { pointer: {} }
    const structure = {
      x: 1,
      sub: {
        items: [1, nested],
      },
    }
    nested.pointer = structure

    assert.throws(() => transcode(nested), /Can not encode circular structure/)
  })

  test('encodes object with same object properties', () => {
    const o = {}
    const data = {
      a: o,
      b: o,
    }

    assert.doesNotThrow(() => transcode(data))
  })

  test('cids', async () => {
    const hello = await write({ hello: 'world' })

    assert.deepEqual(transcode({ message: hello.cid }), {
      message: hello.cid,
    })
  })
}

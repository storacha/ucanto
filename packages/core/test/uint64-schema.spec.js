import * as Schema from '../src/schema.js'
import { test, assert } from './test.js'

/** @type {[unknown, bigint|RegExp][]} */
const vector = [
  [0, 0n],
  [-0, 0n],
  [-1, /negative integer can not/i],
  [0n, 0n],
  [10, 10n],
  [-10n, /negative integer can not/i],
  [10n, 10n],
  [Infinity, /value of type uint64.*Infinity/],
  [-Infinity, /value of type uint64.*\-Infinity/],
  [new Number(17), /value of type uint64.*object/],
  [0xffffffffffffffffn, 0xffffffffffffffffn],
  [0xffffffffffffffffn + 1n, /is too big/],
  [4.2, /value of type uint64.*4\.2/],
  ['7n', /value of type uint64.*"7n"/],
  [[7n], /value of type uint64.*array/],
]

for (const [input, expect] of vector) {
  test(`uint64().from(${Schema.toString(input)})`, () => {
    const schema = Schema.uint64()
    const result = schema.read(input)
    if (expect instanceof RegExp) {
      assert.throws(() => schema.from(input), expect)
      assert.match(String(result.error), expect)
    } else {
      assert.equal(schema.from(input), expect)
      assert.deepEqual(result, { ok: expect })
    }
  })
}

test('struct with uint64', () => {
  const Piece = Schema.struct({ size: Schema.uint64() })
  assert.equal(String(Piece), 'struct({ size: uint64 })')

  assert.deepEqual(Piece.from({ size: 0 }), { size: 0n })
  assert.deepEqual(Piece.from({ size: 10n }), { size: 10n })
  assert.throws(() => Piece.from({ size: 0xffffffffffffffffn + 1n }), /too big/)
  assert.throws(() => Piece.from({ size: -1 }), /negative integer/i)

  assert.throws(() => Piece.from({ size: null }), /type uint64/i)
})

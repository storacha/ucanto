import { test, assert } from './test.js'
import * as UTF8 from '../src/utf8.js'

test('encode <-> decode', async () => {
  assert.deepEqual(UTF8.decode(UTF8.encode('hello')), 'hello')
})

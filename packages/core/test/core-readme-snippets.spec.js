import { test, assert } from './test.js'
import { Schema, parseLink } from '../src/lib.js'

test('README schema example works', async () => {
  const AddFile = Schema.struct({
    with: Schema.uri({ protocol: 'file:' }),
    nb: Schema.struct({
      link: Schema.link(),
    }),
  })

  const result = AddFile.read({
    with: 'file:///tmp/example.txt',
    nb: { link: parseLink('bafkqaaa') },
  })

  assert.ok(!result.error, `Expected no error, got: ${result.error?.message}`)
})

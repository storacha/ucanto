import { test, assert } from './test.js'
import * as Schema from '../src/schema.js'
import fixtures from './schema/fixtures.js'

test('includes on strings', () => {
  const text = Schema.string()
  assert.equal(text.includes('hello', 'world'), false)
  assert.equal(text.includes('hello', 'hello'), true)
  assert.equal(text.includes('hello world', 'hello'), true)
})

test('path includes', () => {
  /**
   * @param {string} path
   */
  const withTrainingDelimiter = path => (path.endsWith('/') ? path : `${path}/`)

  const path = Schema.string().with({
    includes(parent, child) {
      return parent === child || child.startsWith(withTrainingDelimiter(parent))
    },
  })

  assert.equal(path.includes('/foo/bar', '/foo'), false)
  assert.equal(path.includes('/foo', '/foo/bar'), true)
  assert.equal(path.includes('/fo', '/foo/bar'), false)
})

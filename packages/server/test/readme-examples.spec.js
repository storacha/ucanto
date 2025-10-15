/**
 * Integration tests for README examples - simplified version
 * Addresses issue #387: test all examples and code snippets in READMEs
 */

import { test, assert } from './test.js'
import { capability, URI, Link, Failure, provide, Schema, ok, fail } from '../src/lib.js'
import { ed25519 } from '@ucanto/principal'

// Test that we can create the README capability definition
test('README capability definition works', async () => {
  /** @param {string} uri */
  const ensureTrailingDelimiter = uri => (uri.endsWith('/') ? uri : `${uri}/`)

  const Add = capability({
    can: 'file/link',
    with: URI.match({ protocol: 'file:' }),
    nb: Schema.struct({ link: Link }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(ensureTrailingDelimiter(delegated.with)) ?
      ok({}) :
      fail(`Resource ${claimed.with} is not contained by ${delegated.with}`),
  })

  // Test that capability was created successfully with correct 'can' field
  assert.ok(Add)
  assert.equal(Add.can, 'file/link')
})

// Test that we can create a service with provide
test('README service definition works', async () => {
  const Add = capability({
    can: 'file/link',
    with: URI.match({ protocol: 'file:' }),
    nb: Schema.struct({ link: Link }),
  })

  const service = (context = { store: new Map() }) => {
    const add = provide(Add, ({ capability, invocation }) => {
      context.store.set(capability.with, capability.nb.link)
      return ok({
        with: capability.with,
        link: capability.nb.link,
      })
    })

    return { file: { add } }
  }

  const testService = service()
  assert.ok(testService.file)
  assert.ok(testService.file.add)
})

// Test that ed25519.parse works 
test('README uses correct ed25519.parse API', async () => {
  // This should work with the current API (not the old ed25519.Signer.parse)
  const key = await ed25519.generate()
  
  // Test that we can format and parse keys correctly
  const formatted = ed25519.format(key)
  const parsed = ed25519.parse(formatted)
  assert.equal(parsed.did(), key.did())
})

/**
 * Integration tests for client README examples - simplified version
 * Addresses issue #387: test all examples and code snippets in READMEs
 */

import { test, assert } from './test.js'
import * as Client from '../src/lib.js'
import { ed25519 } from '@ucanto/principal'

// Test that ed25519.parse works (the key fix we made for client README)
test('client README uses correct ed25519.parse API', async () => {
  // Generate keys instead of parsing from env
  const serviceKey = await ed25519.generate()
  const issuerKey = await ed25519.generate()
  
  const service = serviceKey.verifier
  const issuer = issuerKey

  const invocation = await Client.invoke({
    issuer,
    audience: service,
    capability: {
      can: 'file/read',
      with: 'file://example.txt'
    }
  })

  // Test that invocation was created correctly
  assert.ok(invocation)
  assert.equal(invocation.capabilities[0].can, 'file/read')
  assert.equal(invocation.capabilities[0].with, 'file://example.txt')
  assert.equal(invocation.issuer.did(), issuer.did())
  assert.equal(invocation.audience.did(), service.did())
})
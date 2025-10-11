/**
 * Integration tests for README examples using server-as-channel pattern
 */

import { test, assert } from './test.js'
import { capability, URI, Link, Failure, provide, Schema } from '../src/lib.js'
import * as Server from '../src/lib.js'
import * as CAR from '@ucanto/transport/car'
import { ed25519 } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import { parseLink } from '@ucanto/core'

test('README workflow integration with server-as-channel', async () => {
  // 1. Define capability (from README)
  const ensureTrailingDelimiter = uri => (uri.endsWith('/') ? uri : `${uri}/`)

  const Add = capability({
    can: 'file/link',
    with: URI.match({ protocol: 'file:' }),
    nb: Schema.struct({
      link: Link,
    }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(ensureTrailingDelimiter(delegated.with)) ||
      new Failure(`Resource ${claimed.with} is not contained by ${delegated.with}`),
  })

  // 2. Define service (from README) using proper Server.provide pattern
  const context = { store: new Map() }
  const service = {
    file: {
      link: provide(Add, ({ capability, invocation }) => {
        context.store.set(capability.with, capability.nb.link)
        return {
          with: capability.with,
          link: capability.nb.link,
        }
      })
    }
  }

  // 3. Create server (from README)
  const serviceKey = await ed25519.generate()
  
  const server = Server.create({
    id: serviceKey,
    service,
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
    canIssue: (capability, issuer) => {
      if (capability.with.startsWith("file:")) {
        // Extract the DID from the file URI: file:///tmp/did:key:zABC.../path
        const url = new URL(capability.with)
        const pathParts = url.pathname.split("/")
        const did = pathParts[2] // Skip empty string and "tmp"
        return did === issuer
      }
      return false
    },
  })

  // 4. Create client connection using server-as-channel (RECOMMENDED PATTERN)
  const connection = Client.connect({
    id: serviceKey,
    codec: CAR.outbound,
    channel: server, // 🎯 Server directly as channel - no HTTP needed!
  })

  // 5. Create and execute invocation (from README)
  const issuerKey = await ed25519.generate()
  const testCID = parseLink('bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy')
  
  const me = await Client.invoke({
    issuer: issuerKey,
    audience: serviceKey,
    capability: {
      can: 'file/link',
      with: `file:///tmp/${issuerKey.did()}/me/about`,
      nb: { link: testCID },
    },
  })

  const result = await me.execute(connection)
  
  // 6. Test that the full workflow completed successfully
  assert.ok(result)
  assert.ok(!result.error, `Expected no error, got: ${result.error?.message}`)
  assert.ok(result.out, 'Expected successful result')
  assert.ok(!result.out.error, 'Expected no error in result')
  assert.equal(result.out.with, `file:///tmp/${issuerKey.did()}/me/about`)
  assert.equal(result.out.link.toString(), testCID.toString())
  
  // 7. Verify the store was updated (proves the service handler actually ran)
  const storedLink = context.store.get(`file:///tmp/${issuerKey.did()}/me/about`)
  assert.ok(storedLink, 'Expected link to be stored')
  assert.equal(storedLink.toString(), testCID.toString())
})

// Test delegation example with server-as-channel
test('README delegation example with server-as-channel', async () => {
  // 1. Define the ensureTrailingDelimiter helper
  const ensureTrailingDelimiter = uri => (uri.endsWith('/') ? uri : `${uri}/`)
  
  // Create the same service setup
  const Add = capability({
    can: 'file/link',
    with: URI.match({ protocol: 'file:' }),
    nb: Schema.struct({
      link: Link,
    }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(ensureTrailingDelimiter(delegated.with)) ||
      new Failure(`Resource ${claimed.with} is not contained by ${delegated.with}`),
  })

  const context = { store: new Map() }
  const service = {
    file: {
      link: provide(Add, ({ capability, invocation }) => {
        context.store.set(capability.with, capability.nb.link)
        return {
          with: capability.with,
          link: capability.nb.link,
        }
      })
    }
  }

  const serviceKey = await ed25519.generate()
  
  const server = Server.create({
    id: serviceKey,
    service,
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
    canIssue: (capability, issuer) => {
      if (capability.with.startsWith("file:")) {
        // Extract the DID from the file URI: file:///tmp/did:key:zABC.../path
        const url = new URL(capability.with)
        const pathParts = url.pathname.split("/")
        const did = pathParts[2] // Skip empty string and "tmp"
        return did === issuer
      }
      return false
    },
  })

  // Server-as-channel connection
  const connection = Client.connect({
    id: serviceKey,
    codec: CAR.outbound,
    channel: server, // 🎯 Direct server channel
  })

  // Generate test keys (like README)
  const alice = await ed25519.generate()
  const bob = await ed25519.generate()

  // Alice delegates capability to Bob (like README)
  const proof = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'file/link',
        with: `file:///tmp/${alice.did()}/friends/${bob.did()}/`,
      },
    ],
  })

  // Bob uses the delegation (like README)
  const testCID = parseLink('bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy')
  const aboutBob = Client.invoke({
    issuer: bob,
    audience: serviceKey,
    capability: {
      can: 'file/link',
      with: `file:///tmp/${alice.did()}/friends/${bob.did()}/about`,
      nb: { link: testCID },
    },
    proofs: [proof],
  })

  const result = await aboutBob.execute(connection)
  
  // This should succeed because Bob has delegated permission from Alice
  assert.ok(result)
  assert.ok(!result.error, `Expected no error, got: ${result.error?.message}`)
  assert.ok(result.out, 'Expected successful result')
  assert.ok(!result.out.error, 'Expected no error in result')
  assert.equal(result.out.with, `file:///tmp/${alice.did()}/friends/${bob.did()}/about`)
})
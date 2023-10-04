import { test, assert, matchError } from './test.js'
import { access, claim, DID, Revoked, Authorization } from '../src/lib.js'
import { capability, fail, URI, Link, Schema } from '../src/lib.js'
import { ed25519, Verifier } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import { UCAN } from '@ucanto/core'

import { alice, bob, mallory, service } from './fixtures.js'
const w3 = service.withDID('did:web:web3.storage')
const Echo = capability({
  can: 'debug/echo',
  with: DID,
  nb: Schema.struct({
    message: Schema.string().optional(),
  }),
})

const expiration = UCAN.now() + 100

test('revoked capability does not validate', async () => {
  const invocation = await Echo.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'hello world',
    },
  }).delegate()

  const result = await access(invocation, {
    authority: w3,
    capability: Echo,
    principal: Verifier,
    validateAuthorization: auth => {
      assert.deepEqual(auth.delegation.cid, invocation.cid)
      assert.deepEqual([...Authorization.iterate(auth)], [invocation.cid])
      return { error: new Revoked(auth.delegation) }
    },
  })

  assert.match(String(result.error), /Proof bafy.* has been revoked/)
  assert.equal(result.error?.name, 'Unauthorized')
  assert.match(JSON.stringify(result.error?.invalidProofs), /"name":"Revoked"/)
})

test('revoked proof does not validate', async () => {
  const proof = await Echo.delegate({
    with: alice.did(),
    issuer: alice,
    audience: bob,
    expiration,
  })

  const invocation = await Echo.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'hello world',
    },
    proofs: [proof],
  }).delegate()

  const result = await access(invocation, {
    authority: w3,
    capability: Echo,
    principal: Verifier,
    validateAuthorization: auth => {
      assert.deepEqual(auth.delegation.cid, invocation.cid)
      assert.deepEqual(auth.delegation.proofs, [proof])
      assert.deepEqual(
        [...Authorization.iterate(auth)],
        [invocation.cid, proof.cid]
      )
      return { error: new Revoked(proof) }
    },
  })

  assert.match(String(result.error), /Proof bafy.* has been revoked/)
  assert.equal(result.error?.name, 'Unauthorized')
  assert.match(JSON.stringify(result.error?.invalidProofs), /"name":"Revoked"/)
})

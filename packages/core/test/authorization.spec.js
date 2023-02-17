import { assert, test } from './test.js'
import {
  Delegation,
  UCAN,
  delegate,
  parseLink,
  isLink,
  isDelegation,
} from '../src/lib.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'

test('basic authorize', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')
  const now = UCAN.now()
  const permit = await Delegation.permit({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        can: 'access/claim',
        with: account.did(),
      },
    ],
  })

  assert.deepEqual(permit.issuer.did(), account.did())
  assert.deepEqual(permit.audience.did(), alice.did())
  assert.deepEqual(permit.capabilities, [
    {
      can: 'access/claim',
      with: account.did(),
    },
  ])
  assert.equal(permit.expiration > now, true)
  assert.equal(permit.notBefore, undefined)
  assert.equal(permit.nonce, undefined)
  assert.deepEqual(isLink(permit.cid), true)
  assert.deepEqual(permit.facts, [])

  const session = await permit.authorize({ issuer: w3 })
  assert.deepEqual(session.expiration, permit.expiration)
  assert.deepEqual(session.notBefore, permit.notBefore)
  assert.deepEqual(session.issuer.did(), permit.issuer.did())
  assert.deepEqual(session.audience.did(), permit.audience.did())
  assert.deepEqual(session.capabilities, permit.capabilities)
  assert.deepEqual(session.nonce, permit.nonce)
  assert.deepEqual(session.facts, permit.facts)

  const [proof] = session.proofs
  if (!isDelegation(proof)) {
    assert.fail('expect delegation')
  }
  assert.deepEqual(proof.expiration, Infinity)
  assert.deepEqual(proof.notBefore, permit.notBefore)
  assert.deepEqual(proof.issuer.did(), w3.did())
  assert.deepEqual(proof.audience.did(), permit.issuer.did())
  assert.deepEqual(proof.nonce, permit.nonce)
  assert.deepEqual(proof.facts, permit.facts)
  assert.deepEqual(proof.capabilities, [
    {
      with: w3.did(),
      can: './update',
      nb: { permit: permit.cid },
    },
  ])
})

test('authorize with optionals', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')
  const now = 1676532426
  const auth = await Delegation.permit({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        can: 'access/claim',
        with: account.did(),
      },
    ],
    nonce: 'whatever',
    expiration: Infinity,
    notBefore: now,
    facts: [{ hello: 'world' }],
  })

  assert.deepEqual(auth.issuer.did(), account.did())
  assert.deepEqual(auth.audience.did(), alice.did())
  assert.deepEqual(auth.capabilities, [
    {
      can: 'access/claim',
      with: account.did(),
    },
  ])
  assert.equal(auth.expiration, Infinity)
  assert.equal(auth.notBefore, now)
  assert.equal(auth.nonce, 'whatever')
  console.log(auth.cid)
  assert.deepEqual(
    auth.cid,
    parseLink('bafyreihz2lyz7zen2wayj3zujra4wor226obrzpru6flslntblnxp7t4qi')
  )
  assert.deepEqual(auth.facts, [{ hello: 'world' }])
})

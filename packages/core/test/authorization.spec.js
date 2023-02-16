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
  const auth = await Delegation.authorize({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        can: 'access/claim',
        with: account.did(),
      },
    ],
  })

  assert.deepEqual(auth.issuer.did(), account.did())
  assert.deepEqual(auth.audience.did(), alice.did())
  assert.deepEqual(auth.capabilities, [
    {
      can: 'access/claim',
      with: account.did(),
    },
  ])
  assert.equal(auth.expiration > now, true)
  assert.equal(auth.notBefore, undefined)
  assert.equal(auth.nonce, undefined)
  assert.deepEqual(isLink(auth.cid), true)
  assert.deepEqual(auth.facts, [])

  const session = await auth.issue({ issuer: w3 })
  assert.deepEqual(session.expiration, auth.expiration)
  assert.deepEqual(session.notBefore, auth.notBefore)
  assert.deepEqual(session.issuer.did(), auth.issuer.did())
  assert.deepEqual(session.audience.did(), auth.audience.did())
  assert.deepEqual(session.capabilities, auth.capabilities)
  assert.deepEqual(session.nonce, auth.nonce)
  assert.deepEqual(session.facts, auth.facts)

  const [proof] = session.proofs
  if (!isDelegation(proof)) {
    assert.fail('expect delegation')
  }
  assert.deepEqual(proof.expiration, Infinity)
  assert.deepEqual(proof.notBefore, auth.notBefore)
  assert.deepEqual(proof.issuer.did(), w3.did())
  assert.deepEqual(proof.audience.did(), auth.issuer.did())
  assert.deepEqual(proof.nonce, auth.nonce)
  assert.deepEqual(proof.facts, auth.facts)
  assert.deepEqual(proof.capabilities, [
    {
      with: w3.did(),
      can: './update',
      nb: { authorization: auth.cid },
    },
  ])
})

test('authorize with optionals', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')
  const now = 1676532426
  const auth = await Delegation.authorize({
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

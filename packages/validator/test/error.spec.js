import { test, assert } from './test.js'
import * as API from '@ucanto/interface'
import {
  Failure,
  InvalidAudience,
  InvalidSignature,
  Expired,
  NotValidBefore,
} from '../src/error.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { delegate, UCAN } from '@ucanto/core'

test('Failure', () => {
  const error = new Failure('boom!')
  const json = JSON.parse(JSON.stringify(error))
  assert.deepInclude(json, {
    name: 'Error',
    message: 'boom!',
    error: true,
    stack: error.stack,
  })

  assert.equal(error instanceof Error, true)
})

test('InvalidAudience', async () => {
  const delegation = await delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/write',
        with: alice.did(),
      },
    ],
    proofs: [],
  })

  const error = new InvalidAudience(bob, delegation)

  assert.deepEqual(error.toJSON(), {
    error: true,
    name: 'InvalidAudience',
    audience: bob.did(),
    delegation: { audience: w3.did() },
    message: `Delegation audience is '${w3.did()}' instead of '${bob.did()}'`,
    stack: error.stack,
  })
})

test('InvalidSignature', async () => {
  const delegation = await delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/write',
        with: alice.did(),
      },
    ],
    proofs: [],
  })

  const error = new InvalidSignature(delegation, alice)
  assert.deepEqual(error.issuer.did(), alice.did())
  assert.deepEqual(error.audience.did(), w3.verifier.did())
})

test('Expired', async () => {
  const expiration = UCAN.now()
  const delegation = await delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/write',
        with: alice.did(),
      },
    ],
    proofs: [],
    expiration,
  })

  const error = new Expired(
    /** @type {API.Delegation & { expiration: number }} */ (delegation)
  )
  assert.deepEqual(error.expiredAt, expiration)

  assert.equal(
    JSON.stringify(error, null, 2),
    JSON.stringify(
      {
        error: true,
        name: 'Expired',
        message: `Proof ${delegation.cid} has expired on ${new Date(
          expiration * 1000
        )}`,
        expiredAt: expiration,
        stack: error.stack,
      },
      null,
      2
    )
  )
})

test('NotValidBefore', async () => {
  const time = UCAN.now()
  const delegation = await delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/write',
        with: alice.did(),
      },
    ],
    proofs: [],
    notBefore: time,
  })

  const error = new NotValidBefore(
    /** @type {API.Delegation & { notBefore: number }} */ (delegation)
  )
  assert.deepEqual(error.validAt, time)

  assert.equal(
    JSON.stringify(error, null, 2),
    JSON.stringify(
      {
        error: true,
        name: 'NotValidBefore',
        message: `Proof ${delegation.cid} is not valid before ${new Date(
          time * 1000
        )}`,
        validAt: time,
        stack: error.stack,
      },
      null,
      2
    )
  )
})

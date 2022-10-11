import { test, assert } from './test.js'
import { Failure, InvalidAudience } from '../src/error.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { delegate } from '@ucanto/core'

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
    message: `Delegates to '${w3.did()}' instead of '${bob.did()}'`,
    stack: error.stack,
  })
})

import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import * as CBOR from '../src/cbor.js'
import * as Legacy from '../src/legacy.js'
import {
  delegate,
  invoke,
  Receipt,
  Delegation,
  UCAN,
  parseLink,
  isLink,
} from '@ucanto/core'
import { alice, bob, mallory, service } from './fixtures.js'

test('Legacy decode / encode', async () => {
  const expiration = 1654298135

  const source = await CAR.outbound.encode([
    invoke({
      issuer: alice,
      audience: bob,
      capability: {
        can: 'store/add',
        with: alice.did(),
      },
      expiration,
      proofs: [],
    }),
  ])

  const accept = await Legacy.inbound.accept({
    headers: { 'content-type': 'application/car' },
    body: source.body,
  })
  if (accept.error) {
    return assert.equal(accept.error, undefined)
  }
  const { encoder, decoder } = accept.ok

  const workflow = await decoder.decode(source)

  const expect = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    expiration,
    proofs: [],
  })

  assert.deepEqual([expect], workflow, 'roundtrips')

  const success = await Receipt.issue({
    ran: expect.cid,
    issuer: bob,
    result: { ok: { hello: 'message' } },
  })

  const failure = await Receipt.issue({
    ran: expect.cid,
    issuer: bob,
    result: { error: { message: 'Boom' } },
  })

  const response = await encoder.encode([success, failure])
  const results = await CBOR.decode(response)

  assert.deepEqual(
    results,
    // @ts-expect-error - This not according to the types but it is what
    // we want to return to old clients.
    [{ hello: 'message' }, { error: true, message: 'Boom' }],
    'roundtrips'
  )
})

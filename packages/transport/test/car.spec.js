import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import {
  delegate,
  invoke,
  Receipt,
  Delegation,
  UCAN,
  parseLink,
} from '@ucanto/core'
import { alice, bob, service } from './fixtures.js'
import { collect } from './util.js'

test('encode / decode', async () => {
  const cid = parseLink(
    'bafyreiaxnmoptsqiehdff2blpptvdbenxcz6xgrbojw5em36xovn2xea4y'
  )
  const expiration = 1654298135

  const request = await CAR.encode([
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

  assert.deepEqual(request.headers, {
    'content-type': 'application/car',
  })

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

  assert.deepEqual([expect], await CAR.decode(request), 'roundtrips')
})

test('decode requires application/car content type', async () => {
  const { body } = await CAR.encode([
    invoke({
      issuer: alice,
      audience: bob,
      capability: {
        can: 'store/add',
        with: alice.did(),
      },
      proofs: [],
    }),
  ])

  try {
    await CAR.decode({
      body,
      headers: {
        'content-type': 'application/octet-stream',
      },
    })
    assert.fail('expected to fail')
  } catch (error) {
    assert.match(String(error), /content-type: application\/car/)
  }
})

test('accepts Content-Type as well', async () => {
  const expiration = UCAN.now() + 90
  const request = await CAR.encode([
    invoke({
      issuer: alice,
      audience: bob,
      capability: {
        can: 'store/add',
        with: alice.did(),
      },
      proofs: [],
      expiration,
    }),
  ])

  const [invocation] = await CAR.decode({
    ...request,
    headers: {
      'Content-Type': 'application/car',
    },
  })

  const delegation = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [],
    expiration,
  })

  assert.deepEqual({ ...request }, { ...(await CAR.encode([delegation])) })

  assert.deepEqual(invocation.bytes, delegation.bytes)
})

test('delegated proofs', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const outgoing = await CAR.encode([
    invoke({
      issuer: bob,
      audience: service,
      capability: {
        can: 'store/add',
        with: alice.did(),
      },
      proofs: [proof],
      expiration,
    }),
  ])

  const incoming = await CAR.decode(outgoing)

  assert.deepEqual(incoming, [
    await delegate({
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [proof],
    }),
  ])

  assert.deepEqual(incoming[0].proofs, [proof])
})

test('omit proof', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const outgoing = await CAR.encode([
    invoke({
      issuer: bob,
      audience: service,
      capability: {
        can: 'store/add',
        with: alice.did(),
      },
      proofs: [proof.cid],
      expiration,
    }),
  ])

  const incoming = await CAR.decode(outgoing)

  assert.deepEqual(incoming, [
    await delegate({
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [proof.cid],
    }),
  ])

  assert.deepEqual(incoming[0].proofs, [proof.cid])
})

test('CAR.request encode / decode', async () => {
  const cid = parseLink(
    'bafyreiaxnmoptsqiehdff2blpptvdbenxcz6xgrbojw5em36xovn2xea4y'
  )
  const expiration = 1654298135

  const request = await CAR.request.encode([
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

  assert.deepEqual(request.headers, {
    'content-type': 'application/car',
    accept: 'application/car',
  })

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

  assert.deepEqual([expect], await CAR.request.decode(request), 'roundtrips')
})

test('CAR.response encode/decode', async () => {
  const ran = await invoke({
    issuer: bob,
    audience: service,
    capability: {
      can: 'test/hello',
      with: alice.did(),
    },
  }).delegate()

  const receipt = await Receipt.issue({
    issuer: alice,
    result: {
      ok: { hello: 'world' },
    },
    ran,
    meta: { test: 'run' },
  })

  const message = await CAR.response.encode([receipt])
  assert.deepEqual(message.headers, {
    'content-type': 'application/car',
  })

  const [received, ...other] = await CAR.response.decode(message)
  assert.equal(other.length, 0)
  assert.deepEqual(received.issuer, receipt.issuer)
  assert.deepEqual(received.meta, receipt.meta)
  assert.deepEqual(received.ran, receipt.ran)
  assert.deepEqual(received.proofs, receipt.proofs)
  assert.deepEqual(received.fx, receipt.fx)
  assert.deepEqual(received.signature, receipt.signature)

  assert.throws(() => {
    CAR.response.decode({
      headers: {},
      body: message.body,
    })
  })
})

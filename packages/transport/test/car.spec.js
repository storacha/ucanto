import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import * as CBOR from '../src/cbor.js'
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
import { CarReader } from '@ipld/car/reader'
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
  const reader = await CarReader.fromBytes(request.body)

  assert.deepEqual(
    await reader.getRoots(),
    // @ts-expect-error - CAR refers to old CID
    [cid]
  )

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

  const reader = await CarReader.fromBytes(outgoing.body)
  const cids = await collect(reader.cids())
  assert.equal(cids.length, 2)
  const roots = await reader.getRoots()
  assert.equal(roots.length, 1)

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

  const reader = await CarReader.fromBytes(outgoing.body)
  const cids = await collect(reader.cids())
  assert.equal(cids.length, 1)

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

test('codec', async () => {
  const root = await CBOR.codec.write({ hello: 'world ' })
  const bytes = CAR.codec.encode({
    roots: [root],
  })
  const { blocks, roots } = await CAR.codec.decode(bytes)
  assert.equal(blocks.size, 1)
  assert.deepEqual(roots, [root])

  const car = await CAR.codec.write({ roots: [root] })
  assert.deepEqual(car.bytes, bytes)
  assert.equal(isLink(car.cid), true)

  const link = await CAR.codec.link(car.bytes)
  assert.deepEqual(car.cid, link)
})

test('car writer', async () => {
  const hello = await CBOR.codec.write({ hello: 'world ' })
  const writer = CAR.codec.createWriter()
  writer.write(hello)
  const bytes = writer.flush()

  const car = await CAR.codec.decode(bytes)
  assert.deepEqual(car.roots, [])
  assert.deepEqual([...car.blocks], [[hello.cid.toString(), hello]])
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
  const reader = await CarReader.fromBytes(request.body)

  assert.deepEqual(
    await reader.getRoots(),
    // @ts-expect-error - CAR refers to old CID
    [cid]
  )

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

  const reader = await CarReader.fromBytes(message.body)
  assert.deepEqual(
    await reader.getRoots(),
    // @ts-expect-error - CAR refers to old CID
    [receipt.root.cid]
  )

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

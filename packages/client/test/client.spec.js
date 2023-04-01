import { test, assert } from './test.js'
import * as Client from '../src/lib.js'
import * as HTTP from '@ucanto/transport/http'
import { CAR, Codec } from '@ucanto/transport'
import * as Service from './service.js'
import { Receipt, CBOR } from '@ucanto/core'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import fetch from '@web-std/fetch'

test('encode invocation', async () => {
  /** @type {Client.ConnectionView<Service.Service>} */
  const connection = Client.connect({
    id: w3,
    channel: HTTP.open({ url: new URL('about:blank'), fetch }),
    codec: CAR.outbound,
  })

  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  const add = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: { link: car.cid },
    },
    proofs: [],
  })

  const payload = await connection.codec.encode([add])

  assert.deepEqual(payload.headers, {
    'content-type': 'application/car',
    accept: 'application/car',
  })
  assert.ok(payload.body instanceof Uint8Array)

  const request = await CAR.decode(payload)

  const [invocation] = request
  assert.equal(request.length, 1)
  assert.equal(invocation.issuer.did(), alice.did())
  assert.equal(invocation.audience.did(), w3.did())
  assert.deepEqual(invocation.proofs, [])
  assert.deepEqual(invocation.capabilities, [
    {
      can: 'store/add',
      with: alice.did(),
      nb: { link: car.cid },
    },
  ])
})

test('encode delegated invocation', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  /** @type {Client.ConnectionView<Service.Service>} */
  const connection = Client.connect({
    id: w3,
    channel: HTTP.open({ url: new URL('about:blank'), fetch }),
    codec: CAR.outbound,
  })

  const proof = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const add = Client.invoke({
    issuer: bob,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: { link: car.cid },
    },
    proofs: [proof],
  })

  const remove = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/remove',
      with: alice.did(),
      link: car.cid,
    },
  })

  const payload = await connection.codec.encode([add, remove])
  const request = await CAR.decode(payload)
  {
    const [add, remove] = request
    assert.equal(request.length, 2)

    assert.equal(add.issuer.did(), bob.did())
    assert.equal(add.audience.did(), w3.did())
    assert.deepEqual(add.capabilities, [
      {
        can: 'store/add',
        with: alice.did(),
        nb: { link: car.cid },
      },
    ])

    assert.deepEqual(add.proofs, [proof])
    const delegation = /** @type {Client.Delegation} */ (
      add.proofs && add.proofs[0]
    )
    assert.equal(delegation.issuer.did(), proof.issuer.did())
    assert.equal(delegation.audience.did(), proof.audience.did())
    assert.deepEqual(delegation.capabilities, proof.capabilities)

    assert.equal(remove.issuer.did(), alice.did())
    assert.equal(remove.audience.did(), w3.did())
    assert.deepEqual(remove.proofs, [])
    assert.deepEqual(remove.capabilities, [
      {
        can: 'store/remove',
        with: alice.did(),
        link: car.cid,
      },
    ])
  }
})

const service = Service.create()

const channel = HTTP.open({
  url: new URL('about:blank'),
  fetch: async (url, input) => {
    /** @type {Client.Tuple<Client.Invocation>} */
    const invocations = await CAR.request.decode(input)
    const promises = invocations.map(async invocation => {
      const [capability] = invocation.capabilities
      switch (capability.can) {
        case 'store/add': {
          const result = await service.store.add(
            /** @type {Client.Invocation<any>} */ (invocation)
          )
          return Receipt.issue({
            ran: invocation.cid,
            issuer: w3,
            result,
          })
        }
        case 'store/remove': {
          const result = await service.store.remove(
            /** @type {Client.Invocation<any>} */ (invocation)
          )
          return Receipt.issue({
            ran: invocation.cid,
            issuer: w3,
            result,
          })
        }
      }
    })

    const receipts = /** @type {Client.Tuple<Client.Receipt>} */ (
      await Promise.all(promises)
    )

    const { headers, body } = await CAR.response.encode(receipts)

    return {
      ok: true,
      headers: new Map(Object.entries(headers)),
      arrayBuffer: () => body,
    }
  },
})

/** @type {Client.ConnectionView<Service.Service>} */
const connection = Client.connect({
  id: w3,
  channel,
  codec: CAR.outbound,
})

test('execute', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  const add = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: { link: car.cid },
    },
    proofs: [],
  })

  const remove = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/remove',
      with: alice.did(),
      nb: { link: car.cid },
    },
  })

  const e1 = await add.execute(connection)

  assert.deepEqual(e1.out, {
    error: {
      name: 'UnknownDIDError',
      message: `DID ${alice.did()} has no account`,
      did: alice.did(),
    },
  })

  // fake register alice
  service.access.accounts.register(
    alice.did(),
    'did:email:alice@web.mail',
    car.cid
  )

  const [r1] = await connection.execute(add)
  assert.deepEqual(r1.out, {
    ok: {
      with: alice.did(),
      link: car.cid,
      status: 'upload',
      url: 'http://localhost:9090/',
    },
  })
})

test('execute with delegations', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  const add = Client.invoke({
    issuer: bob,
    audience: w3,
    capability: {
      can: 'store/add',
      with: bob.did(),
      nb: { link: car.cid },
    },
    proofs: [],
  })

  const [e1] = await connection.execute(await add.delegate())

  assert.deepEqual(e1.out, {
    error: {
      name: 'UnknownDIDError',
      message: `DID ${bob.did()} has no account`,
      did: bob.did(),
    },
  })

  // fake register alice
  service.access.accounts.register(bob.did(), 'did:email:bob@web.mail', car.cid)

  const [r1] = await connection.execute(await add.delegate())
  assert.deepEqual(r1.out, {
    ok: {
      with: bob.did(),
      link: car.cid,
      status: 'upload',
      url: 'http://localhost:9090/',
    },
  })
})

test('decode error', async () => {
  const client = Client.connect({
    id: w3,
    channel,
    codec: Codec.outbound({
      encoders: {
        'application/car': CAR.request,
      },
      decoders: {
        'application/car+receipt': CAR.response,
      },
    }),
  })

  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  const add = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: { link: car.cid },
    },
    proofs: [],
  })

  const [e1] = await client.execute(await add.delegate())
  assert.deepEqual(e1.out, {
    error: {
      error: true,
      message:
        "Can not decode response with content-type 'application/car' because no matching transport decoder is configured.",
    },
  })
})

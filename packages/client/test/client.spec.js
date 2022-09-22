import { test, assert } from './test.js'
import * as Client from '../src/lib.js'
import * as HTTP from '@ucanto/transport/http'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Service from './service.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import fetch from '@web-std/fetch'

test('encode inovocation', async () => {
  /** @type {Client.ConnectionView<Service.Service>} */
  const connection = Client.connect({
    id: w3,
    channel: HTTP.open({ url: new URL('about:blank'), fetch }),
    encoder: CAR,
    decoder: CBOR,
  })

  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: 'world ' })],
  })

  const add = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      link: car.cid,
    },
    proofs: [],
  })

  const payload = await connection.encoder.encode([add])

  assert.deepEqual(payload.headers, {
    'content-type': 'application/car',
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
      // @ts-ignore
      link: car.cid,
    },
  ])
})

test('encode delegated invocation', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: 'world ' })],
  })

  /** @type {Client.ConnectionView<Service.Service>} */
  const connection = Client.connect({
    id: w3,
    channel: HTTP.open({ url: new URL('about:blank'), fetch }),
    encoder: CAR,
    decoder: CBOR,
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
      link: car.cid,
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

  const payload = await connection.encoder.encode([add, remove])
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
        link: car.cid,
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
/** @type {Client.ConnectionView<Service.Service>} */
const connection = Client.connect({
  id: w3,
  channel: HTTP.open({
    url: new URL('about:blank'),
    fetch: async (url, input) => {
      const invocations = await CAR.decode(input)
      const promises = invocations.map(invocation => {
        const [capabality] = invocation.capabilities
        switch (capabality.can) {
          case 'store/add': {
            return service.store.add(
              /** @type {Client.Invocation<any>} */ (invocation)
            )
          }
          case 'store/remove': {
            return service.store.remove(
              /** @type {Client.Invocation<any>} */ (invocation)
            )
          }
        }
      })

      const results = await Promise.all(promises)

      const { headers, body } = await CBOR.encode(results)

      return {
        ok: true,
        headers: new Map(Object.entries(headers)),
        arrayBuffer: () => body,
      }
    },
  }),
  encoder: CAR,
  decoder: CBOR,
})

test('execute', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: 'world ' })],
  })

  const add = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      link: car.cid,
    },
    proofs: [],
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

  const e1 = await add.execute(connection)

  assert.deepEqual(e1, {
    error: true,
    name: 'UnknownDIDError',
    message: `DID ${alice.did()} has no account`,
    did: alice.did(),
  })

  // fake register alice
  service.access.accounts.register(
    alice.did(),
    'did:email:alice@web.mail',
    car.cid
  )

  const [r1] = await connection.execute(add)
  assert.deepEqual(r1, {
    with: alice.did(),
    link: car.cid,
    status: 'upload',
    url: 'http://localhost:9090/',
  })
})

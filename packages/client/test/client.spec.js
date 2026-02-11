import { test, assert } from './test.js'
import * as Client from '../src/lib.js'
import * as HTTP from '@ucanto/transport/http'
import { CAR, Codec } from '@ucanto/transport'
import * as Service from './service.js'
import { Receipt, Message, CBOR } from '@ucanto/core'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import fetch from '@web-std/fetch'
import * as Server from '@ucanto/server'
import { Schema } from '@ucanto/validator'

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

  const message = await Message.build({ invocations: [add] })
  const payload = await connection.codec.encode(message)

  assert.deepEqual(payload.headers, {
    'content-type': 'application/vnd.ipld.car',
    accept: 'application/vnd.ipld.car',
  })
  assert.ok(payload.body instanceof Uint8Array)

  const request = await CAR.request.decode(payload)

  const [invocation] = request.invocations
  assert.equal(request.invocations.length, 1)
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

  const message = await Message.build({ invocations: [add, remove] })
  const payload = await connection.codec.encode(message)
  const request = await CAR.request.decode(payload)
  {
    const [add, remove] = request.invocations
    assert.equal(request.invocations.length, 2)

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
    assert.deepEqual(
      [
        Object({
          can: 'store/remove',
          with: alice.did(),
          link: car.cid,
        }),
      ],
      remove.capabilities
    )
  }
})

// Create the service instance
const service = Service.create()

// Define capabilities
const storeAddCapability = Server.capability({
  can: 'store/add',
  with: Server.URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    link: Server.Link.match().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return Server.fail(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return Server.fail(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return Server.ok({})
    }
  },
})

const storeRemoveCapability = Server.capability({
  can: 'store/remove',
  with: Server.URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    link: Server.Link.match().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return Server.fail(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return Server.fail(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return Server.ok({})
    }
  },
})

// Create server with service handlers using Server.provide
const server = Server.create({
  id: w3,
  service: {
    store: {
      add: Server.provide(storeAddCapability, async ({ capability, invocation }) => {
        // Call the existing service method with the invocation
        return await service.store.add(/** @type {Client.Invocation<any>} */ (invocation))
      }),
      remove: Server.provide(storeRemoveCapability, async ({ capability, invocation }) => {
        // Call the existing service method with the invocation
        return await service.store.remove(/** @type {Client.Invocation<any>} */ (invocation))
      }),
    },
  },
  codec: CAR.inbound,
  validateAuthorization: () => ({ ok: {} }),
})

// Use server directly as channel (no HTTP, no mock fetch!)
/** @type {Client.ConnectionView<Service.Service>} */
const connection = Client.connect({
  id: w3,
  channel: server, // 🎯 Server directly as channel - validates delegation chains!
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
      // @ts-expect-error
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
      // @ts-expect-error
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
    channel: server,
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

  assert.deepEqual(
    {
      error: {
        message:
          "Can not decode response with content-type 'application/vnd.ipld.car' because no matching transport decoder is configured.",
        // @ts-expect-error
        name: 'TypeError',
        error: true,
      },
    },
    e1.out
  )
})

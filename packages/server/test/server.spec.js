import * as Client from '@ucanto/client'
import { invoke, Schema } from '@ucanto/core'
import * as Server from '../src/lib.js'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/core/cbor'
import * as Transport from '@ucanto/transport'
import { DIDResolutionError } from '@ucanto/validator'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import * as Service from '../../client/test/service.js'
import { test, assert } from './test.js'

const storeAdd = Server.capability({
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

const storeRemove = Server.capability({
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

const store = storeAdd.or(storeRemove)

test('encode delegated invocation', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  const server = Server.create({
    service: Service.create(),
    codec: CAR.inbound,
    id: w3,
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: w3,
    codec: CAR.outbound,
    channel: server,
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
      nb: {
        link: car.cid,
      },
    },
    proofs: [proof],
  })

  const remove = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/remove',
      with: alice.did(),
      nb: {
        link: car.cid,
      },
    },
  })

  {
    const result = await Client.execute([add, remove], connection)

    assert.equal(result.length, 2)
    const [r1, r2] = result

    assert.deepEqual(r1.out, {
      error: {
        // @ts-expect-error
        name: 'UnknownDIDError',
        did: alice.did(),
        message: `DID ${alice.did()} has no account`,
      },
    })

    assert.deepEqual(r2.out, {
      error: {
        // @ts-expect-error
        name: 'UnknownDIDError',
        did: alice.did(),
        message: `DID ${alice.did()} has no account`,
      },
    })
  }

  const identify = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'access/identify',
      with: 'did:email:alice@mail.com',
    },
  })

  const register = await identify.execute(connection)

  assert.deepEqual(register.out, { ok: {} })

  {
    const receipts = await Client.execute([add, remove], connection)
    assert.deepEqual(receipts.length, 2)
    const [r1, r2] = receipts

    assert.deepEqual(r1.out, {
      ok: {
        status: 'upload',
        with: alice.did(),
        link: car.cid,
        url: 'http://localhost:9090/',
      },
    })

    assert.deepEqual(r2.out, {
      ok: {
        can: 'store/remove',
        with: alice.did(),
        nb: {
          link: car.cid,
        },
      },
    })
  }
})

test('unknown handler', async () => {
  const server = Server.create({
    id: w3,
    service: Service.create(),
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: w3,
    codec: CAR.outbound,
    channel: server,
  })

  const register = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'access/register',
      with: 'did:email:alice@mail.com',
    },
  })

  // @ts-expect-error - reporst that service has no such capability
  const error = await register.execute(connection)

  assert.containSubset(error, {
    out: {
      error: {
        error: true,
        name: 'HandlerNotFound',
        message: `service does not implement {can: "access/register"} handler`,
        capability: {
          can: 'access/register',
          with: 'did:email:alice@mail.com',
        },
      },
    },
  })

  const boom = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/boom',
      with: 'about:me',
    },
  })

  // @ts-expect-error - reporst that service has no such capability
  const error2 = await boom.execute(connection)
  assert.containSubset(error2, {
    out: {
      error: {
        error: true,
        name: 'HandlerNotFound',
        message: `service does not implement {can: "test/boom"} handler`,
        capability: {
          can: 'test/boom',
          with: 'about:me',
        },
      },
    },
  })
})

test('execution error', async () => {
  const server = Server.create({
    service: {
      test: {
        /**
         * @param {Server.API.Invocation<{can: "test/boom", with:string}>} _
         */
        boom(_) {
          throw new Server.Failure('Boom')
        },
      },
    },
    codec: CAR.inbound,
    id: w3,
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: w3,
    codec: CAR.outbound,
    channel: server,
  })

  const boom = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/boom',
      with: alice.did(),
    },
  })

  const receipt = await boom.execute(connection)

  assert.containSubset(receipt, {
    issuer: w3.verifier,
    out: {
      error: {
        error: true,
        name: 'HandlerExecutionError',
        message: `service handler {can: "test/boom"} error: Boom`,
        capability: {
          can: 'test/boom',
          with: alice.did(),
        },
        cause: {
          message: 'Boom',
          name: 'Error',
        },
      },
    },
  })
})

test('did:web server', async () => {
  const server = Server.create({
    service: Service.create(),
    codec: CAR.inbound,
    id: w3.withDID('did:web:web3.storage'),
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: server.id,
    codec: CAR.outbound,
    channel: server,
  })

  const identify = Client.invoke({
    issuer: alice,
    audience: server.id,
    capability: {
      can: 'access/identify',
      with: 'did:email:alice@mail.com',
    },
  })

  const receipt = await identify.execute(connection)

  assert.containSubset(receipt, {
    out: {
      ok: {},
    },
  })

  assert.deepEqual(receipt.issuer?.did(), server.id.did())
})

test('did:web principal resolve', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })

  const account = bob.withDID('did:web:bob.example.com')

  const server = Server.create({
    service: {
      store: {
        add: Server.provide(storeAdd, () => Schema.ok({})),
      },
    },
    codec: CAR.inbound,
    id: w3,
    resolveDIDKey: did => did === account.did()
      ? Server.ok(bob.did())
      : Server.error(new DIDResolutionError(did)),
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: server.id,
    codec: CAR.outbound,
    channel: server,
  })

  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: account,
    with: alice.did(),
  })

  const add = Client.invoke({
    issuer: account,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: {
        link: car.cid,
      },
    },
    proofs: [proof],
  })

  const receipt = await add.execute(connection)
  assert.deepEqual(receipt.out, {
    ok: {},
  })
})

test('alternative audience', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.write({ hello: 'world ' })],
  })
  const alias = bob.withDID('did:web:alias.storage')

  const server = Server.create({
    service: {
      store: {
        add: Server.provide(storeAdd, () => Schema.ok({})),
      },
    },
    codec: CAR.inbound,
    id: w3.withDID('did:web:web3.storage'),
    audience: Schema.or(
      Schema.literal('did:web:web3.storage'),
      Schema.literal(alias.did()),
    ),
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: server.id,
    codec: CAR.outbound,
    channel: server,
  })

  const identify = Client.invoke({
    issuer: alice,
    audience: alias,
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: {
        link: car.cid,
      },
    },
  })

  const receipt = await identify.execute(connection)

  assert.containSubset(receipt, {
    out: {
      ok: {},
    },
  })

  assert.deepEqual(receipt.issuer?.did(), server.id.did())
})

test('unsupported content-type', async () => {
  const server = Server.create({
    service: Service.create(),
    id: w3.withDID('did:web:web3.storage'),
    codec: Transport.inbound({
      decoders: {
        'application/workflow+car': CAR.request,
      },
      encoders: {
        'application/car': CAR.response,
      },
    }),
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: server.id,
    codec: CAR.outbound,
    channel: server,
  })

  const identify = Client.invoke({
    issuer: alice,
    audience: server.id,
    capability: {
      can: 'access/identify',
      with: 'did:email:alice@mail.com',
    },
  })

  const receipt = await identify.execute(connection)
  assert.containSubset(receipt, {
    out: {
      error: {
        message:
          'The server cannot process the request because the payload format is not supported. Please check the content-type header and try again with a supported media type.',
        status: 415,
        headers: {
          accept: 'application/workflow+car',
        },
      },
    },
  })
})

test('falsy errors are turned into {}', async () => {
  const testNull = Server.capability({
    can: 'test/null',
    with: Server.Schema.did(),
    nb: Schema.struct({}),
  })

  const server = Server.create({
    service: {
      test: {
        null: Server.provide(
          testNull,

          async () => {
            return { ok: {} }
          }
        ),
      },
    },
    id: w3.withDID('did:web:web3.storage'),
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
  })

  const connection = Client.connect({
    id: server.id,
    codec: CAR.outbound,
    channel: server,
  })

  const receipt = await Client.invoke({
    issuer: alice,
    audience: server.id,
    capability: {
      can: 'test/null',
      with: alice.did(),
    },
  }).execute(connection)

  assert.deepEqual(receipt.out, {
    ok: {},
  })
})

test('run invocation without encode / decode', async () => {
  const server = Server.create({
    service: Service.create(),
    codec: CAR.inbound,
    id: w3,
    validateAuthorization: () => ({ ok: {} }),
  })

  const identify = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'access/identify',
      with: 'did:email:alice@mail.com',
    },
  })

  const register = await server.run(identify)
  assert.deepEqual(register.out, {
    ok: {},
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
      nb: {
        link: car.cid,
      },
    },
    proofs: [],
  })

  const receipt = await server.run(add)

  assert.deepEqual(receipt.out, {
    ok: {
      link: car.cid,
      status: 'upload',
      url: 'http://localhost:9090/',
      with: alice.did(),
    },
  })
})

import * as Client from '@ucanto/client'
import * as Server from '../src/lib.js'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import * as Service from '../../client/test/service.js'
import { test, assert } from './test.js'
import { Schema } from '@ucanto/validator'

const storeAdd = Server.capability({
  can: 'store/add',
  with: Server.URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    link: Server.Link.match().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return new Server.Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return new Server.Failure(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return true
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
      return new Server.Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return new Server.Failure(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return true
    }
  },
})

const store = storeAdd.or(storeRemove)

test('encode delegated invocation', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: 'world ' })],
  })

  const server = Server.create({
    service: Service.create(),
    decoder: CAR.request,
    encoder: CAR.response,
    id: w3,
  })

  const connection = Client.connect({
    id: w3,
    encoder: CAR.request,
    decoder: CAR.response,
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
        error: true,
        name: 'UnknownDIDError',
        did: alice.did(),
        message: `DID ${alice.did()} has no account`,
      },
    })

    assert.deepEqual(r2.out, {
      error: {
        error: true,
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
    decoder: CAR,
    encoder: CBOR,
  })

  const connection = Client.connect({
    id: w3,
    encoder: CAR,
    decoder: CBOR,
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

  assert.deepNestedInclude(error, {
    error: true,
    name: 'HandlerNotFound',
    message: `service does not implement {can: "access/register"} handler`,
    capability: {
      can: 'access/register',
      with: 'did:email:alice@mail.com',
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
  assert.deepNestedInclude(error2, {
    error: true,
    name: 'HandlerNotFound',
    message: `service does not implement {can: "test/boom"} handler`,
    capability: {
      can: 'test/boom',
      with: 'about:me',
    },
  })
})

test('execution error', async () => {
  const server = Server.create({
    service: {
      test: {
        /**
         * @param {Server.Invocation<{can: "test/boom", with:string}>} _
         */
        boom(_) {
          throw new Server.Failure('Boom')
        },
      },
    },
    decoder: CAR,
    encoder: CBOR,
    id: w3,
  })

  const connection = Client.connect({
    id: w3,
    encoder: CAR,
    decoder: CBOR,
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

  const error = await boom.execute(connection)

  assert.containSubset(error, {
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
  })
})

test('did:web server', async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: 'world ' })],
  })

  const server = Server.create({
    service: Service.create(),
    decoder: CAR,
    encoder: CBOR,
    id: w3.withDID('did:web:web3.storage'),
  })

  const connection = Client.connect({
    id: server.id,
    encoder: CAR,
    decoder: CBOR,
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

  const register = await identify.execute(connection)

  assert.deepEqual(register, null)
})

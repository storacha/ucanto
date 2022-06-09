import * as Client from "@ucanto/client"
import * as Server from "../src/server.js"
import * as CAR from "@ucanto/transport/car"
import * as CBOR from "@ucanto/transport/cbor"
import { alice, bob, mallory, service as w3 } from "./fixtures.js"
import * as Service from "../../client/test/service.js"
import { test, assert } from "./test.js"

test("encode delegated invocation", async () => {
  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: "world " })],
  })

  const server = Server.create({
    service: Service.create(),
    decoder: CAR,
    encoder: CBOR,
  })

  const connection = Client.connect({
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })

  const proof = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const add = Client.invoke({
    issuer: bob,
    audience: w3,
    capability: {
      can: "store/add",
      with: alice.did(),
      link: car.cid,
    },
    proofs: [proof],
  })

  const remove = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: "store/remove",
      with: alice.did(),
      link: car.cid,
    },
  })

  const result = await Client.execute([add, remove], connection)

  assert.deepEqual(result, [
    {
      error: true,
      name: "UnknownDIDError",
      did: alice.did(),
      message: `DID ${alice.did()} has no account`,
    },
    {
      error: true,
      name: "UnknownDIDError",
      did: alice.did(),
      message: `DID ${alice.did()} has no account`,
    },
  ])

  const identify = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: "access/identify",
      with: "did:email:alice@mail.com",
    },
  })

  const register = await identify.execute(connection)

  assert.deepEqual(register, null)

  const result2 = await Client.execute([add, remove], connection)

  assert.deepEqual(result2, [
    {
      status: "upload",
      with: alice.did(),
      link: car.cid,
      url: "http://localhost:9090/",
    },
    {
      can: "store/remove",
      with: alice.did(),
      link: car.cid,
    },
  ])
})

test("unknown handler", async () => {
  const server = Server.create({
    service: Service.create(),
    decoder: CAR,
    encoder: CBOR,
  })

  const connection = Client.connect({
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })

  const register = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: "access/register",
      with: "did:email:alice@mail.com",
    },
  })

  // @ts-expect-error - reporst that service has no such capability
  const error = await register.execute(connection)

  assert.containSubset(error, {
    error: true,
    name: "HandlerNotFound",
    message: `service does not implement {can: "access/register"} handler`,
    capability: {
      can: "access/register",
      with: "did:email:alice@mail.com",
    },
  })

  const boom = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: "test/boom",
      with: "about:me",
    },
  })

  // @ts-expect-error - reporst that service has no such capability
  const error2 = await boom.execute(connection)
  assert.containSubset(error2, {
    error: true,
    name: "HandlerNotFound",
    message: `service does not implement {can: "test/boom"} handler`,
    capability: {
      can: "test/boom",
      with: "about:me",
    },
  })
})

test("execution error", async () => {
  const server = Server.create({
    service: {
      test: {
        /**
         * @param {Server.Invocation<{can: "test/boom", with:"about:me"}>} _
         */
        boom(_) {
          throw new Error("Boom")
        },
      },
    },
    decoder: CAR,
    encoder: CBOR,
  })

  const connection = Client.connect({
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })

  const boom = Client.invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: "test/boom",
      with: "about:me",
    },
  })

  const error = await boom.execute(connection)

  assert.containSubset(error, {
    error: true,
    name: "HandlerExecutionError",
    message: `service handler {can: "test/boom"} error: Boom`,
    capability: {
      can: "test/boom",
      with: "about:me",
    },
    cause: {
      message: "Boom",
      name: "Error",
    },
  })
})

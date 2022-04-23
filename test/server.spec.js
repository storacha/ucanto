import { assert } from "chai"
import * as Client from "../src/client.js"
import * as Server from "../src/server.js"
import * as Transport from "../src/transport.js"
import { writeCAR, writeCBOR, importActors } from "./util.js"
import * as Service from "./service.js"

describe("server", () => {
  it("encode delegated invocation", async () => {
    const { alice, bob, web3Storage } = await importActors()
    const car = await writeCAR([await writeCBOR({ hello: "world " })])

    const server = Server.create({
      service: Service.create(),
      decoder: Transport.CAR,
      encoder: Transport.CBOR,
    })

    const connection = Client.connect({
      encoder: Transport.CAR,
      decoder: Transport.CBOR,
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

    const add = await Client.invoke({
      issuer: bob,
      audience: web3Storage,
      capability: {
        can: "store/add",
        with: alice.did(),
        link: car.cid,
      },
      proofs: [proof],
    })

    const remove = await Client.invoke({
      issuer: alice,
      audience: web3Storage,
      capability: {
        can: "store/remove",
        with: alice.did(),
        link: car.cid,
      },
    })

    const result = await Client.batch(add, remove).execute(connection)

    assert.deepEqual(result, [
      {
        ok: false,
        name: "UnknownDIDError",
        did: alice.did(),
        message: `DID ${alice.did()} has no account`,
      },
      {
        did: alice.did(),
        message: `DID ${alice.did()} has no account`,
        name: "UnknownDIDError",
        ok: false,
      },
    ])

    const identify = await Client.invoke({
      issuer: alice,
      audience: web3Storage,
      capability: {
        can: "access/identify",
        with: "did:email:alice@mail.com",
      },
    })

    const register = await identify.execute(connection)

    assert.deepEqual(register, {
      ok: true,
      value: null,
    })

    const result2 = await Client.batch(add, remove).execute(connection)

    assert.deepEqual(result2, [
      {
        ok: true,
        value: {
          status: "upload",
          with: alice.did(),
          link: car.cid,
          url: "http://localhost:9090/",
        },
      },
      {
        ok: true,
        value: {
          can: "store/remove",
          with: alice.did(),
          link: car.cid,
        },
      },
    ])
  })
})

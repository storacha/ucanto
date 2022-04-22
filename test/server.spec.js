import { assert } from "chai"
import * as Client from "../src/client.js"
import * as Handler from "../src/listener.js"
import * as Listener from "../src/listener.js"
import * as Transport from "../src/transport.js"
import * as CBOR from "@ipld/dag-cbor"
import * as Packet from "../src/transport/packet.js"
import { writeCAR, writeCBOR, importActors } from "./util.js"
import * as UCAN from "@ipld/dag-ucan"
import * as Service from "./service.js"

describe("server", () => {
  it("encode delegated invocation", async () => {
    const { alice, bob, web3Storage } = await importActors()
    const car = await writeCAR([await writeCBOR({ hello: "world " })])

    /** @type {Client.ConnectionView<Service.Service>} */
    const connection = Client.connect({
      encoder: Transport.CAR,
      decoder: Transport.CBOR,
      channel: Transport.HTTP.open(new URL("about:blank")),
    })

    const accounts = Service.Accounts.create()

    const handler = Handler.handler({
      service: Service.create({ store: Service.Storage.create({ accounts }) }),
      decoder: Transport.CAR,
      encoder: Transport.CBOR,
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

    const payload = await connection.encoder.encode(Client.batch(add, remove))
    const response = await handler.handle(payload)
    const result = await connection.decoder.decode(response)

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

    await accounts.register(alice.did(), "did:email:alice@mail.com", car.cid)
    assert.notEqual(await accounts.resolve(alice.did()), null)

    const result2 = await connection.decoder.decode(
      await handler.handle(payload)
    )

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

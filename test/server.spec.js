import { assert } from "chai"
import * as Client from "../src/client.js"
import * as Handler from "../src/listener.js"
import * as Listener from "../src/listener.js"
import * as Transport from "../src/transport.js"
import * as CBOR from "@ipld/dag-cbor"
import * as Packet from "../src/transport/packet.js"
import { writeCAR, writeCBOR, importActors } from "./util.js"
import * as UCAN from "@ipld/dag-ucan"

describe("server", () => {
  /**
   * @typedef {{
   * can: "store/add"
   * with: UCAN.DID
   * link: UCAN.Link
   * }} Add
   *
   * @typedef {{
   * status: "done"
   * with: UCAN.DID
   * link: UCAN.Link
   * }} Added
   *
   * @typedef {{
   * status: "upload"
   * with: UCAN.DID
   * link: UCAN.Link
   * url: string
   * }} Upload
   *
   * @typedef {{
   * can: "store/remove"
   * with: UCAN.DID
   * link: UCAN.Link
   * }} Remove
   */
  const service = {
    store: {
      /**
       * @param {Client.Invocation<Add>} ucan
       * @returns {Promise<Client.Result<Added|Upload, string>>}
       */
      async add(ucan) {
        const { capability } = ucan
        if (capability.with === ucan.issuer.did()) {
          // can do it
        } else {
        }
        return {
          ok: true,
          value: {
            with: capability.with,
            link: capability.link,
            status: "upload",
            url: "http://localhost:9090/",
          },
        }
      },
      /**
       * @param {Client.Invocation<Remove>} ucan
       * @returns {Promise<Client.Result<Remove, string>>}
       */
      async remove(ucan) {
        const { capability } = ucan
        return {
          ok: true,
          value: capability,
        }
      },
    },
  }
  it("encode delegated invocation", async () => {
    const { alice, bob, web3Storage } = await importActors()
    const car = await writeCAR([await writeCBOR({ hello: "world " })])

    /** @type {Client.ConnectionView<typeof service>} */
    const connection = Client.connect({
      encoder: Transport.CAR,
      decoder: Transport.CBOR,
      channel: Transport.HTTP.open(new URL("about:blank")),
    })

    const handler = Handler.handler({
      service,
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

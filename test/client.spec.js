import { assert } from "chai"
import * as Client from "../src/client.js"
import * as Transport from "../src/transport.js"
import * as Packet from "../src/transport/packet.js"
import { writeCAR, writeCBOR, importActors } from "./util.js"
import * as UCAN from "@ipld/dag-ucan"
import { isLink } from "../src/transport/packet.js"

describe("delegation", () => {
  it("delegation can be transpcoded as ucan", async () => {
    const { alice, bob } = await importActors()
    const token = await Client.delegate({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    })

    const ucan = Packet.importDelegation(token.export())

    assert.equal(ucan.issuer.did(), alice.did())
    assert.equal(ucan.audience.did(), bob.did())
    assert.deepEqual(ucan.capabilities, [
      {
        can: "store/add",
        with: alice.did(),
      },
    ])
  })

  it("delegation can be decoded", async () => {
    const { alice, bob } = await importActors()
    const token = await Client.delegate({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    })

    const ucan = Packet.importDelegation(token.export())

    assert.deepEqual(ucan, token)
  })

  it("delegation can be chained", async () => {
    const { alice, bob, mallory } = await importActors()
    const u1 = await Client.delegate({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    })

    const u2 = await Client.delegate({
      issuer: bob,
      audience: mallory,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [u1],
    })

    assert.deepEqual(u2.issuer.did(), bob.did())
    assert.deepEqual(u2.audience.did(), mallory.did())
    assert.deepEqual(u2.capabilities, [
      {
        can: "store/add",
        with: alice.did(),
      },
    ])
    assert.ok(isLink(u2.body.proofs[0]))
    const [proof] = u2.proofs || []

    if (isLink(proof)) {
      assert.fail("must be a delegation")
    }

    assert.deepEqual(u1.bytes, proof.bytes)

    assert.deepEqual(
      [...u1.export()],
      [{ cid: u1.cid, bytes: u1.bytes, data: u1.data }]
    )
    assert.deepEqual(
      [...proof.export()],
      [{ cid: u1.cid, bytes: u1.bytes, data: u1.data }]
    )

    assert.deepEqual(
      [...u2.export()],
      [
        { cid: u1.cid, bytes: u1.bytes, data: u1.data },
        { cid: u2.cid, bytes: u2.bytes, data: u2.data },
      ]
    )
    assert.deepEqual(u2.code, UCAN.code)

    assert.deepEqual(Packet.importDelegation(u2.export()), u2)
  })

  it("3 level deep chain", async () => {
    const { alice, bob, mallory, web3Storage } = await importActors()
    const u1 = await Client.delegate({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    })

    const u2 = await Client.delegate({
      issuer: bob,
      audience: mallory,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [u1],
    })

    const u3 = await Client.delegate({
      issuer: mallory,
      audience: web3Storage,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [u2],
    })

    assert.deepEqual(
      [...u3.export()],
      [
        { cid: u1.cid, bytes: u1.bytes, data: u1.data },
        { cid: u2.cid, bytes: u2.bytes, data: u2.data },
        { cid: u3.cid, bytes: u3.bytes, data: u3.data },
      ]
    )

    assert.deepEqual(Packet.importDelegation(u3.export()), u3)
  })
})

describe("invoke", () => {
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
       * @param {Client.Instruction<Add>} ucan
       * @returns {Promise<Client.Result<Added|Upload, string>>}
       */
      async add(ucan) {
        const [action] = ucan.capabilities
        if (action.with === ucan.issuer) {
          // can do it
        } else {
        }
        return {
          ok: true,
          value: { ...action, status: "upload", url: "http://localhost:9090/" },
        }
      },
      /**
       * @param {Client.Instruction<Remove>} ucan
       * @returns {Promise<Client.Result<Remove, string>>}
       */
      async remove(ucan) {
        const [action] = ucan.capabilities
        return {
          ok: true,
          value: action,
        }
      },
    },
  }

  it("encode inovocation", async () => {
    const { alice, web3Storage } = await importActors()
    /** @type {Client.ConnectionView<typeof service>} */
    const connection = Client.connect({ codec: Transport.CAR })

    const car = await writeCAR([await writeCBOR({ hello: "world " })])
    const add = Client.invoke({
      issuer: alice,
      audience: web3Storage,
      capability: {
        can: "store/add",
        with: alice.did(),
        link: car.cid,
      },
      proofs: [],
    })

    const batch = Client.batch(add)
    const payload = await connection.encode(batch)

    assert.deepEqual(payload.headers, {
      "content-type": "application/car",
    })
    assert.ok(payload.body instanceof Uint8Array)

    const request = await connection.decode(payload)

    const [invocation] = request.invocations
    assert.equal(request.invocations.length, 1)
    assert.equal(invocation.issuer.did(), alice.did())
    assert.equal(invocation.audience.did(), web3Storage.did())
    assert.deepEqual(invocation.proofs, [])
    assert.deepEqual(invocation.capability, {
      can: "store/add",
      with: alice.did(),
      // @ts-ignore
      link: car.cid,
    })
  })

  it("encode delegated invocation", async () => {
    const { alice, bob, web3Storage } = await importActors()
    const car = await writeCAR([await writeCBOR({ hello: "world " })])

    /** @type {Client.ConnectionView<typeof service>} */
    const connection = Client.connect({ codec: Transport.CAR })

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

    const payload = await connection.encode(Client.batch(add, remove))
    const request = await connection.decode(payload)
    {
      const [add, remove] = request.invocations
      assert.equal(request.invocations.length, 2)

      assert.equal(add.issuer.did(), bob.did())
      assert.equal(add.audience.did(), web3Storage.did())
      assert.deepEqual(add.capability, {
        can: "store/add",
        with: alice.did(),
        link: car.cid,
      })

      assert.deepEqual(add.proofs, [proof])
      const delegation = /** @type {Client.Delegation} */ (
        add.proofs && add.proofs[0]
      )
      assert.equal(delegation.issuer.did(), proof.issuer.did())
      assert.equal(delegation.audience.did(), proof.audience.did())
      assert.deepEqual(delegation.capabilities, proof.capabilities)

      assert.equal(remove.issuer.did(), alice.did())
      assert.equal(remove.audience.did(), web3Storage.did())
      assert.deepEqual(remove.proofs, [])
      assert.deepEqual(remove.capability, {
        can: "store/remove",
        with: alice.did(),
        link: car.cid,
      })
    }
  })
})

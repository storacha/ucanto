import { assert } from 'chai'
import * as Client from '../src/client/lib.js'
import * as API from '../src/api.js'
import { writeCAR, writeCBOR, importActors } from './util.js'
import * as UCAN from '@ipld/dag-ucan'

describe('encode', () => {
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
       * @param {API.Instruction<Add>} ucan
       * @returns {Promise<API.Result<Added|Upload, string>>}
       */
      async add(ucan) {
        const [action] = ucan.capabilities
        if (action.with === ucan.issuer) {
          // can do it
        } else {
        }
        return {
          ok: true,
          value: { ...action, status: 'upload', url: 'http://localhost:9090/' },
        }
      },
      /**
       * @param {API.Instruction<Remove>} ucan
       * @returns {Promise<API.Result<Remove, string>>}
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

  it('encode inovocation', async () => {
    const { alice, web3Storage } = await importActors()
    /** @type {Client.Connection<typeof service>} */
    const connection = Client.open({
      codec: Client.Transport.CAR,
    })

    const car = await writeCAR([await writeCBOR({ hello: 'world ' })])
    const add = Client.invoke({
      issuer: alice,
      audience: web3Storage,
      capability: {
        can: 'store/add',
        with: alice.did(),
        link: car.cid,
      },
      proofs: [],
    })

    const batch = Client.batch(add)
    const payload = await connection.codec.encode(batch)

    assert.deepEqual(payload.headers, {
      'content-type': 'application/car',
    })
    assert.ok(payload.body instanceof Uint8Array)

    const request = await connection.codec.decode(payload)

    const [invocation] = request.invocations
    assert.equal(request.invocations.length, 1)
    assert.equal(invocation.issuer.did(), alice.did())
    assert.equal(invocation.audience.did(), web3Storage.did())
    assert.deepEqual(invocation.proofs, undefined)
    assert.equal(request.delegations.size, 0)
    assert.deepEqual(invocation.capability, {
      can: 'store/add',
      with: alice.did(),
      // @ts-ignore
      link: car.cid,
    })
  })

  it('encode delegated invocation', async () => {
    const { alice, bob, web3Storage } = await importActors()
    const car = await writeCAR([await writeCBOR({ hello: 'world ' })])

    /** @type {Client.Connection<typeof service>} */
    const connection = Client.open({
      codec: Client.Transport.CAR,
    })

    const proof = await UCAN.issue({
      issuer: alice,
      audience: bob.did(),
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
    })

    const add = await Client.invoke({
      issuer: bob,
      audience: web3Storage,
      capability: {
        can: 'store/add',
        with: alice.did(),
        link: car.cid,
      },
      proofs: [proof],
    })

    const remove = await Client.invoke({
      issuer: alice,
      audience: web3Storage,
      capability: {
        can: 'store/remove',
        with: alice.did(),
        link: car.cid,
      },
    })

    const payload = await connection.codec.encode(Client.batch(add, remove))
    const request = await connection.codec.decode(payload)
    {
      const [add, remove] = request.invocations
      assert.equal(request.invocations.length, 2)
      assert.equal(request.delegations.size, 1)

      assert.equal(add.issuer.did(), bob.did())
      assert.equal(add.audience.did(), web3Storage.did())
      assert.deepEqual(add.capability, {
        can: 'store/add',
        with: alice.did(),
        link: car.cid,
      })

      const proofLink = await UCAN.link(proof)
      console.log(add.proofs)
      assert.deepEqual(add.proofs, [proofLink])
      assert.deepEqual(request.delegations.get(proofLink.toString()), proof)

      assert.equal(remove.issuer.did(), alice.did())
      assert.equal(remove.audience.did(), web3Storage.did())
      assert.equal(remove.proofs, undefined)
      assert.deepEqual(remove.capability, {
        can: 'store/remove',
        with: alice.did(),
        link: car.cid,
      })
    }
  })
})

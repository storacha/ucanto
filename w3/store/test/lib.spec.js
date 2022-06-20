import { test, assert } from "./test.js"
import * as Client from "@ucanto/client"
import * as CAR from "@ucanto/transport/car"
import * as CBOR from "@ucanto/transport/cbor"
import { SigningAuthority } from "@ucanto/authority"
import * as Identity from "./identity.js"
import * as Accounting from "./accounting.js"
import * as Store from "../src/lib.js"
import * as Signer from "w3-signer"
import { alice, bob, mallory, service as validator } from "./fixtures.js"

test("main", async () => {
  const w3store = await SigningAuthority.generate()
  const w3id = await SigningAuthority.generate()
  const s3 = new Map()
  const metadata = new Map()
  const accounts = new Map()

  const id = Client.connect({
    encoder: CAR,
    decoder: CBOR,
    channel: Identity.server({
      id: w3id.authority,
      context: { db: accounts },
      decoder: CAR,
      encoder: CBOR,
    }),
  })

  const server = Store.server({
    transport: {
      encoder: CBOR,
      decoder: CAR,
    },
    context: {
      self: w3store,
      accounting: Accounting.service({
        db: metadata,
        cars: s3,
      }),
      signer: Signer,
      signerConfig: {
        accessKeyId: "id",
        secretAccessKey: "secret",
        region: "us-east-2",
        bucket: "my-test-bucket",
      },
      identity: {
        id: w3id.authority,
        client: id,
      },
    },
  })

  const store = Client.connect({
    channel: server,
    encoder: CAR,
    decoder: CBOR,
  })

  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: "world" })],
  })

  // errors if not registered
  {
    const result = await Store.add({
      issuer: alice,
      audience: w3store.authority,
      link: car.cid,
    }).execute(store)

    assert.containSubset(result, {
      error: true,
      name: "NotRegistered",
      message: `No account is registered for ${alice.did()}`,
    })
  }

  // can not register without a proof
  {
    // service delegates to the validator
    const validatorToken = await Client.delegate({
      issuer: w3id,
      audience: validator,
      capabilities: [
        {
          can: "identity/register",
          with: "mailto:*",
        },
      ],
    })

    // validator after validation delegates to alice
    const registrationToken = await Client.delegate({
      issuer: validator,
      audience: alice,
      capabilities: [
        {
          can: "identity/register",
          with: "mailto:alice@web.mail",
        },
      ],
      proofs: [validatorToken],
    })

    const result = await Identity.register({
      issuer: alice,
      audience: w3id,
      id: "mailto:alice@web.mail",
      proof: registrationToken,
    }).execute(id)

    assert.deepEqual(result, null)
  }

  // alice should be able to check her identity
  {
    const result = await Identity.identify({
      issuer: alice,
      audience: w3id,
      id: alice.did(),
    }).execute(id)

    assert.match(String(result), /did:ipld:bafy/)
  }

  // now that alice is registered she can add a car file
  {
    const result = await Store.add({
      issuer: alice,
      audience: w3store.authority,
      link: car.cid,
    }).execute(store)

    assert.containSubset(result, {
      status: "upload",
      with: alice.did(),
      link: car.cid,
    })

    assert.match(Object(result).url, /https:.*s3.*amazon/)
  }

  // if alice adds a car that is already in s3 no upload will be needed
  {
    const car = await CAR.codec.write({
      roots: [await CBOR.codec.write({ another: "car" })],
    })

    // add car to S3
    s3.set(`${car.cid}/data`, true)

    const result = await Store.add({
      issuer: alice,
      audience: w3store.authority,
      link: car.cid,
    }).execute(store)

    assert.containSubset(result, {
      status: "done",
      with: alice.did(),
      link: car.cid,
      url: undefined,
    })
  }

  // bob can not store/add into alice's group
  {
    const result = await Store.add({
      issuer: bob,
      audience: w3store.authority,
      group: alice.did(),
      link: car.cid,
    }).execute(store)

    assert.containSubset(result, {
      error: true,
      name: "Unauthorized",
    })
  }

  // but if alice delegates capability to bob we can add to alice's group
  {
    const result = await Store.add({
      issuer: bob,
      audience: w3store.authority,
      group: alice.did(),
      link: car.cid,
      proof: await Client.delegate({
        issuer: alice,
        audience: bob,
        capabilities: [
          {
            can: "store/add",
            with: alice.did(),
          },
        ],
      }),
    }).execute(store)

    assert.containSubset(result, {
      with: alice.did(),
      link: car.cid,
    })
  }
})

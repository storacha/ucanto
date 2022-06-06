import { test, assert } from "./test.js"
import * as CAR from "../src/car.js"
import * as UCAN from "@ipld/dag-ucan"
import { delegate, Delegation } from "@ucanto/core"
import * as UTF8 from "../src/utf8.js"
import { alice, bob, mallory, service } from "./fixtures.js"
import { CarReader } from "@ipld/car/reader"
import * as API from "@ucanto/interface"
import { CID } from "multiformats"
import { collect } from "./util.js"

test("encode / decode", async () => {
  const cid = CID.parse(
    "bafyreigw75rhf7gf7eubwmrhovcrdu4mfy6pfbi4wgbzlfieq2wlfsza5i"
  )
  const expiration = 1654298135

  const request = await CAR.encode([
    {
      issuer: alice,
      audience: bob.authority,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [],
    },
  ])

  assert.deepEqual(request.headers, {
    "content-type": "application/car",
  })
  const reader = await CarReader.fromBytes(request.body)

  assert.deepEqual(await reader.getRoots(), [cid])

  const expect = await Delegation.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    expiration,
    proofs: [],
  })
  const actual = assert.containSubset(
    [expect],
    await CAR.decode(request),
    "roundtrips"
  )
})

test("decode requires application/car contet type", async () => {
  const { body } = await CAR.encode([
    {
      issuer: alice,
      audience: bob.authority,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [],
    },
  ])

  try {
    await CAR.decode({
      body,
      headers: {
        "content-type": "application/octet-stream",
      },
    })
    assert.fail("expected to fail")
  } catch (error) {
    assert.match(String(error), /content-type: application\/car/)
  }
})

test("accepts Content-Type as well", async () => {
  const expiration = UCAN.now() + 90
  const request = await CAR.encode([
    {
      issuer: alice,
      audience: bob.authority,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [],
      expiration,
    },
  ])

  const [invocation] = await CAR.decode({
    ...request,
    headers: {
      "Content-Type": "application/car",
    },
  })

  const delegation = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [],
    expiration,
  })

  assert.deepEqual(invocation.bytes, delegation.bytes)
})

test("delegated proofs", async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const outgoing = await CAR.encode([
    {
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [proof],
      expiration,
    },
  ])

  const reader = await CarReader.fromBytes(outgoing.body)
  const cids = await collect(reader.cids())
  assert.equal(cids.length, 2)
  const roots = await reader.getRoots()
  assert.equal(roots.length, 1)

  const incoming = await CAR.decode(outgoing)

  assert.deepEqual(incoming, [
    await delegate({
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [proof],
    }),
  ])

  assert.deepEqual(incoming[0].proofs, [proof])
})

test("omit proof", async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const outgoing = await CAR.encode([
    {
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [proof.cid],
      expiration,
    },
  ])

  const reader = await CarReader.fromBytes(outgoing.body)
  const cids = await collect(reader.cids())
  assert.equal(cids.length, 1)

  const incoming = await CAR.decode(outgoing)

  assert.deepEqual(incoming, [
    await delegate({
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [proof.cid],
    }),
  ])

  assert.deepEqual(incoming[0].proofs, [proof.cid])
})

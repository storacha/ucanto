import { assert, test } from "./test.js"
import { Delegation, isLink } from "../src/lib.js"
import * as UCAN from "@ipld/dag-ucan"
import { alice, bob, mallory, service } from "./fixtures.js"

test("basic delegation", async () => {
  const data = await UCAN.issue({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const { cid, bytes } = await UCAN.write(data)
  const delegation = new Delegation({
    cid,
    bytes,
    data,
  })

  assert.containSubset(delegation, {
    data,
    cid,
    bytes,
    issuer: data.issuer,
    audience: data.audience,
    version: data.version,
    signature: data.signature,

    capabilities: {
      ...[
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    },

    notBefore: undefined,
    expiration: data.expiration,
    nonce: undefined,
    facts: [],
    proofs: [],
  })

  assert.equal(delegation.issuer.did(), alice.did())
  assert.equal(delegation.audience.did(), bob.did())

  const dag = [...delegation.export()]
  assert.containSubset(dag, [
    {
      cid,
      bytes,
      data,
    },
  ])
})

test("delegation with proof", async () => {
  let proof
  {
    const data = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    })

    const { cid, bytes } = await UCAN.write(data)
    const block = { cid, data, bytes }
    proof = new Delegation(block)
  }

  const data = await UCAN.issue({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [proof.cid],
  })

  const { cid, bytes } = await UCAN.write(data)
  const block = { cid, data, bytes }
  const delegation = new Delegation(
    block,
    new Map([[proof.cid.toString(), proof]])
  )

  assert.containSubset(delegation, {
    cid,
    data,
    bytes,
    issuer: data.issuer,
    audience: data.audience,

    capabilities: {
      ...[
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    },

    notBefore: undefined,
    expiration: data.expiration,
    nonce: undefined,
    facts: [],
  })

  assert.equal(delegation.issuer.did(), bob.did())
  assert.equal(delegation.audience.did(), mallory.did())

  const dag = [...delegation.export()]
  assert.deepEqual(dag, [
    {
      cid: proof.cid,
      bytes: proof.bytes,
      data: proof.data,
    },
    {
      cid,
      bytes,
      data,
    },
  ])

  const { proofs } = delegation
  assert.equal(proofs.length, 1)
  const [actual] = proofs
  assert.containSubset(actual, {
    data: proof.data,
    cid: proof.cid,
    bytes: proof.bytes,
  })
})

test("delegation chain", async () => {
  let proof
  {
    const data = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
    })

    const { cid, bytes } = await UCAN.write(data)
    const block = { cid, data, bytes }
    proof = new Delegation(block)
  }

  let delegation
  {
    const data = await UCAN.issue({
      issuer: bob,
      audience: mallory,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
        },
      ],
      proofs: [proof.cid],
    })

    const { cid, bytes } = await UCAN.write(data)
    const block = { cid, data, bytes }
    delegation = new Delegation(block, new Map([[proof.cid.toString(), proof]]))
  }

  const data = await UCAN.issue({
    issuer: mallory,
    audience: service,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation.cid],
  })

  const { cid, bytes } = await UCAN.write(data)
  const block = { cid, data, bytes }

  {
    const invocation = new Delegation(
      block,
      new Map([[delegation.cid.toString(), delegation]])
    )

    assert.equal(invocation.issuer.did(), mallory.did())
    assert.equal(invocation.audience.did(), service.did())

    const dag = [...invocation.export()]

    assert.deepEqual(
      dag,
      [
        {
          cid: delegation.cid,
          bytes: delegation.bytes,
          data: delegation.data,
        },
        block,
      ],
      "only contains included parts"
    )

    const { proofs } = invocation
    assert.equal(proofs.length, 1)
    const [actual] = proofs
    assert.containSubset(actual, {
      data: delegation.data,
      cid: delegation.cid,
      bytes: delegation.bytes,
      proofs: [proof.cid],
    })

    if (isLink(actual)) {
      return assert.fail("expect not to be a link")
    }

    assert.deepEqual(
      [...actual.export()],
      [
        {
          data: delegation.data,
          cid: delegation.cid,
          bytes: delegation.bytes,
        },
      ],
      "exports only root block"
    )
  }

  {
    const invocation = new Delegation(
      block,
      new Map([
        [delegation.cid.toString(), delegation],
        [proof.cid.toString(), proof],
      ])
    )

    assert.equal(invocation.issuer.did(), mallory.did())
    assert.equal(invocation.audience.did(), service.did())

    const dag = [...invocation.export()]

    assert.deepEqual(
      dag,
      [
        {
          cid: proof.cid,
          bytes: proof.bytes,
          data: proof.data,
        },
        {
          cid: delegation.cid,
          bytes: delegation.bytes,
          data: delegation.data,
        },
        block,
      ],
      "contains all blocks"
    )

    const { proofs } = invocation
    assert.equal(proofs.length, 1)
    const [actual] = proofs
    assert.containSubset(actual, {
      data: delegation.data,
      cid: delegation.cid,
      bytes: delegation.bytes,
    })

    if (isLink(actual)) {
      return assert.fail("expect not to be a link")
    }

    assert.deepEqual(
      [...actual.export()],
      [
        {
          cid: proof.cid,
          bytes: proof.bytes,
          data: proof.data,
        },
        {
          data: delegation.data,
          cid: delegation.cid,
          bytes: delegation.bytes,
        },
      ],
      "exports proofs"
    )

    assert.equal(actual.proofs.length, 1)
    assert.containSubset(actual.proofs[0], {
      data: proof.data,
      cid: proof.cid,
      bytes: proof.bytes,
      proofs: [],
    })
  }
})

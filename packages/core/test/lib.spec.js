import { assert, test } from './test.js'
import { Delegation, UCAN, isDelegation } from '../src/lib.js'
import { alice, bob, mallory, service } from './fixtures.js'

test('create delegation', async () => {
  const data = await UCAN.issue({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const { cid, bytes } = await UCAN.write(data)
  const delegation = Delegation.create({
    root: {
      cid,
      bytes,
    },
  })

  assert.deepNestedInclude(delegation, {
    data,
    cid,
    bytes,
    issuer: data.issuer,
    audience: data.audience,
    version: data.version,
    signature: data.signature,

    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    notBefore: undefined,
    expiration: data.expiration,
    nonce: undefined,
    facts: [],
    proofs: [],
  })

  assert.equal(delegation.issuer.did(), alice.did())
  assert.equal(delegation.audience.did(), bob.did())

  const dag = [...delegation.export()]
  assert.deepEqual(dag, [
    {
      cid,
      bytes,
    },
  ])
})

test('create delegation (with just cid and bytes)', async () => {
  const data = await UCAN.issue({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const { cid, bytes } = await UCAN.write(data)
  const delegation = Delegation.create({
    root: {
      cid,
      bytes,
    },
  })

  assert.deepNestedInclude(delegation, {
    data,
    cid,
    bytes,
    issuer: data.issuer,
    audience: data.audience,
    version: data.version,
    signature: data.signature,

    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],

    notBefore: undefined,
    expiration: data.expiration,
    nonce: undefined,
    facts: [],
    proofs: [],
  })

  assert.equal(delegation.issuer.did(), alice.did())
  assert.equal(delegation.audience.did(), bob.did())

  const dag = [...delegation.export()]
  assert.deepEqual(dag, [
    {
      cid,
      bytes,
    },
  ])
})

test('create delegation with attached proof', async () => {
  let proof
  {
    const data = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
    })

    const { cid, bytes } = await UCAN.write(data)
    proof = Delegation.create({ root: { cid, bytes } })
  }

  const data = await UCAN.issue({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof.cid],
  })

  const root = await UCAN.write(data)
  const delegation = Delegation.create({
    root,
    blocks: new Map([[`${proof.cid}`, proof.root]]),
  })

  assert.deepNestedInclude(delegation, {
    root,
    data,
    bytes: root.bytes,
    cid: root.cid,
    issuer: data.issuer,
    audience: data.audience,

    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],

    notBefore: undefined,
    expiration: data.expiration,
    nonce: undefined,
    facts: [],
  })

  assert.deepEqual(delegation.cid, root.cid)
  assert.equal(delegation.issuer.did(), bob.did())
  assert.equal(delegation.audience.did(), mallory.did())

  assert.deepEqual(
    [...delegation.export()],
    [proof.root, root],
    'exports proof and a root'
  )

  const { proofs } = delegation
  assert.equal(proofs.length, 1)
  const [actual] = proofs
  assert.deepEqual(actual, proof)
})

test('create delegation chain', async () => {
  let proof
  {
    const data = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
    })

    const { cid, bytes } = await UCAN.write(data)
    proof = Delegation.create({ root: { cid, bytes } })
  }

  let delegation
  {
    const data = await UCAN.issue({
      issuer: bob,
      audience: mallory,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      proofs: [proof.cid],
    })

    const { cid, bytes } = await UCAN.write(data)
    delegation = Delegation.create({
      root: { cid, bytes },
      blocks: new Map([[`${proof.cid}`, proof.root]]),
    })
  }

  const ucan = await UCAN.issue({
    issuer: mallory,
    audience: service,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [delegation.cid],
  })

  const { cid, bytes } = await UCAN.write(ucan)
  const root = { cid, data: ucan.model, bytes }

  {
    const invocation = Delegation.create({
      root,
      blocks: new Map([[`${delegation.cid}`, delegation.root]]),
    })

    assert.equal(invocation.issuer.did(), mallory.did())
    assert.equal(invocation.audience.did(), service.did())

    assert.deepEqual(
      [...invocation.export()],
      [delegation.root, root],
      'excludes proof that was not included'
    )

    const { proofs } = invocation
    assert.equal(proofs.length, 1)
    const [actual] = proofs
    assert.deepNestedInclude(
      actual,
      {
        cid: delegation.cid,
        bytes: delegation.bytes,
        proofs: [proof.cid],
      },
      'references proof via link'
    )

    if (!isDelegation(actual)) {
      return assert.fail('expect not to be a link')
    }

    assert.deepEqual(
      [...actual.export()],
      [delegation.root],
      'exports only root block'
    )
  }

  {
    const invocation = Delegation.create({
      root,
      blocks: new Map([
        [`${delegation.cid}`, delegation.root],
        [proof.cid.toString(), proof.root],
      ]),
    })

    assert.equal(invocation.issuer.did(), mallory.did())
    assert.equal(invocation.audience.did(), service.did())

    const dag = [...invocation.export()]

    assert.deepEqual(
      dag,
      [proof.root, delegation.root, root],
      'contains all the proof blocks'
    )

    const { proofs } = invocation
    assert.equal(proofs.length, 1)
    const [actual] = proofs
    assert.deepNestedInclude(actual, {
      cid: delegation.cid,
      bytes: delegation.bytes,
    })

    if (!isDelegation(actual)) {
      return assert.fail('expect not to be a link')
    }

    assert.deepEqual(
      [...actual.export()],
      [proof.root, delegation.root],
      'exports linked proof'
    )

    assert.equal(actual.proofs.length, 1)
    assert.deepNestedInclude(
      actual.proofs[0],
      {
        cid: proof.cid,
        bytes: proof.bytes,
        proofs: [],
      },
      'contains no proofs'
    )
  }
})

test('import delegation', async () => {
  const original = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const replica = Delegation.importDAG(original.export())
  assert.deepEqual(replica, original)

  assert.equal(replica.issuer.did(), alice.did())
  assert.equal(replica.audience.did(), bob.did())
  assert.deepEqual(replica.capabilities, [
    {
      can: 'store/add',
      with: alice.did(),
    },
  ])
})

test('import empty delegation', async () => {
  assert.throws(
    () => Delegation.importDAG([]),
    /Empty DAG can not be turned into a delegation/
  )
})

test('issue chained delegation', async () => {
  const proof = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const invocation = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof],
  })

  assert.deepEqual(invocation.issuer.did(), bob.did())
  assert.deepEqual(invocation.audience.did(), mallory.did())
  assert.deepEqual(invocation.capabilities, [
    {
      can: 'store/add',
      with: alice.did(),
    },
  ])

  const [delegation] = invocation.proofs || []

  if (!isDelegation(delegation)) {
    return assert.fail('must be a delegation')
  }

  assert.deepEqual(delegation.bytes, proof.bytes)

  assert.deepEqual([...proof.export()], [proof.root])
  assert.deepEqual([...delegation.export()], [proof.root])

  assert.deepEqual([...invocation.export()], [proof.root, invocation.root])

  assert.deepEqual(Delegation.importDAG(invocation.export()), invocation)
})

test('delegation with with nested proofs', async () => {
  const proof = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const delegation = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof],
  })

  const invocation = await Delegation.delegate({
    issuer: mallory,
    audience: service,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  assert.deepEqual(
    [...invocation.export()],
    [proof.root, delegation.root, invocation.root],
    'exports all the blocks'
  )

  assert.deepEqual(Delegation.importDAG(invocation.export()), invocation)
})

test('delegation with external proof', async () => {
  const proof = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const invocation = await Delegation.delegate({
    issuer: bob,
    audience: service,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof.cid],
  })

  assert.deepEqual(invocation.proofs, [proof.cid])

  assert.deepEqual(
    [...invocation.export()],
    [invocation.root],
    'exports all the blocks'
  )

  assert.deepEqual(Delegation.importDAG(invocation.export()), invocation)
})

test('delegation with several proofs', async () => {
  const proof1 = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const proof2 = await Delegation.delegate({
    issuer: service,
    audience: mallory,
    capabilities: [
      {
        can: 'identity/prove',
        with: 'mailto:mallory@mail.com',
      },
    ],
  })

  const delegation = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof1],
  })

  const invocation = await Delegation.delegate({
    issuer: mallory,
    audience: service,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
      {
        can: 'identity/prove',
        with: 'mailto:mallory@mail.com',
      },
    ],
    proofs: [delegation, proof2],
  })

  assert.deepEqual(
    [...invocation.export()],
    [proof1.root, delegation.root, proof2.root, invocation.root],
    'exports all the blocks'
  )

  assert.deepEqual(Delegation.importDAG(invocation.export()), invocation)
})

test('delegation iterate over proofs', async () => {
  const proof1 = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const proof2 = await Delegation.delegate({
    issuer: service,
    audience: mallory,
    capabilities: [
      {
        can: 'identity/prove',
        with: 'mailto:mallory@mail.com',
      },
    ],
  })

  const delegation = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof1],
  })

  const invocation = await Delegation.delegate({
    issuer: mallory,
    audience: service,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
      {
        can: 'identity/prove',
        with: 'mailto:mallory@mail.com',
      },
    ],
    proofs: [delegation, proof2],
  })

  const proofs = []
  for (const proof of invocation.iterate()) {
    proofs.push(proof.cid)
  }

  assert.deepEqual(proofs, [proof1.cid, delegation.cid, proof2.cid])
})

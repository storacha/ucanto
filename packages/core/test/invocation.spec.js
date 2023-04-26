import { invoke, UCAN, Invocation } from '../src/lib.js'
import { alice, service as w3 } from './fixtures.js'
import { getBlock } from './utils.js'
import { assert, test } from './test.js'

test('encode invocation', async () => {
  const add = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      link: 'bafy...stuff',
    },
    proofs: [],
  })

  const delegation = await add.delegate()

  assert.deepNestedInclude(delegation, {
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
        link: 'bafy...stuff',
      },
    ],
    proofs: [],
  })

  assert.deepEqual(delegation.issuer.did(), alice.did())
  assert.deepEqual(delegation.audience.did(), w3.did())
})

test('encode invocation with attached block', async () => {
  const add = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      link: 'bafy...stuff',
    },
    proofs: [],
  })

  const block = await getBlock({ test: 'inlineBlock' })
  add.attach(block)

  const delegationBlocks = []
  const view = await add.buildIPLDView()
  for (const b of view.iterateIPLDBlocks()) {
    delegationBlocks.push(b)
  }

  assert.ok(delegationBlocks.find(b => b.cid.equals(block.cid)))
})

test('expired invocation', async () => {
  const expiration = UCAN.now() - 5
  const invocation = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    expiration,
  })

  assert.deepNestedInclude(await invocation.buildIPLDView(), {
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    expiration,
  })
})

test('invocation with notBefore', async () => {
  const notBefore = UCAN.now() + 500
  const invocation = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    notBefore,
  })

  assert.deepNestedInclude(await invocation.buildIPLDView(), {
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    notBefore,
  })
})

test('invocation with nonce', async () => {
  const invocation = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    nonce: 'hello',
  })

  assert.deepNestedInclude(await invocation.buildIPLDView(), {
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    nonce: 'hello',
  })
})

test('invocation with facts', async () => {
  const invocation = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    facts: [
      {
        hello: 'world',
      },
    ],
  })

  assert.deepNestedInclude(await invocation.delegate(), {
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    facts: [
      {
        hello: 'world',
      },
    ],
  })
})

test('execute invocation', async () => {
  const add = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'store/add',
      with: alice.did(),
      link: 'bafy...stuff',
    },
    proofs: [],
  })

  const result = await add.execute({
    /**
     * @param {any} invocation
     * @returns {Promise<any>}
     */
    // @ts-expect-error
    async execute(invocation) {
      assert.deepEqual(invocation, add)
      return [{ hello: 'world' }]
    },
  })

  // Note that types expect us to return receipt but here we
  // just test that execute simply returns `connection.execute(this)[0]` which
  // will not be a receipt due to our implementation above.
  // @ts-expect-error
  assert.deepEqual(result, { hello: 'world' })
})

test('receipt view fallback', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  assert.throws(
    () => Invocation.view({ root: invocation.cid, blocks: new Map() }),
    /not found/
  )

  assert.deepEqual(
    Invocation.view({ root: invocation.cid, blocks: new Map() }, null),
    null,
    'returns fallback'
  )
})

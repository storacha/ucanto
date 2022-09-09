import { invoke, UCAN } from '../src/lib.js'
import { alice, service as w3 } from './fixtures.js'
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

  assert.containSubset(delegation, {
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

test('expired invocation', async () => {
  const expiration = UCAN.now() - 5
  const invocation = invoke({
    issuer: alice,
    audience: w3.principal,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },

    expiration,
  })

  assert.containSubset(await invocation.delegate(), {
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
    audience: w3.principal,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    notBefore,
  })

  assert.containSubset(await invocation.delegate(), {
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
    audience: w3.principal,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    nonce: 'hello',
  })

  assert.containSubset(await invocation.delegate(), {
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
    audience: w3.principal,
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

  assert.containSubset(await invocation.delegate(), {
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

  assert.deepEqual(result, { hello: 'world' })
})

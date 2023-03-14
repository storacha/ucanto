import { assert, test } from './test.js'
import { Delegation, delegate } from '../src/lib.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'

test('basic', async () => {
  const echo = await delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'test/echo',
        with: alice.did(),
      },
    ],
  })

  assert.deepEqual(Delegation.allows(echo), {
    [alice.did()]: {
      'test/echo': [{}],
    },
  })
})

test('expands ucan:*', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        with: 'ucan:*',
        can: 'test/echo',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: '*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      'test/echo': [{}],
    },
    [mallory.did()]: {
      'test/echo': [{}],
    },
  })
})

test('expands ucan:* and matches can', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        with: 'ucan:*',
        can: 'test/echo',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: 'test/*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      'test/echo': [{}],
    },
    [mallory.did()]: {
      'test/echo': [{}],
    },
  })
})

test('expands { with: "ucan:*", can: "*" }', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: 'debug/echo',
            nb: {
              message: 'hello',
            },
          },
          {
            with: mallory.did(),
            can: 'test/echo',
          },
        ],
      }),
      await Delegation.delegate({
        issuer: bob,
        audience: alice,
        capabilities: [
          {
            with: bob.did(),
            can: '*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      '*': [{}],
    },
    [mallory.did()]: {
      'debug/echo': [{ message: 'hello' }],
      'test/echo': [{}],
    },
    [bob.did()]: {
      '*': [{}],
    },
  })
})

test('expands { with: "ucan:*", can: "*" } & merges nb', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
        nb: { limit: 5 },
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: 'debug/echo',
            nb: {
              message: 'hello',
            },
          },
          {
            with: mallory.did(),
            can: 'test/echo',
          },
        ],
      }),
      await Delegation.delegate({
        issuer: bob,
        audience: alice,
        capabilities: [
          {
            with: bob.did(),
            can: '*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      '*': [{ limit: 5 }],
    },
    [mallory.did()]: {
      'debug/echo': [{ message: 'hello', limit: 5 }],
      'test/echo': [{ limit: 5 }],
    },
    [bob.did()]: {
      '*': [{ limit: 5 }],
    },
  })
})

test('expands { with: "ucan:*", can: "store/*" }', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        with: 'ucan:*',
        can: 'store/*',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: 'store/add',
            nb: {
              size: 100,
            },
          },
          {
            with: mallory.did(),
            can: 'upload/add',
          },
        ],
      }),
      await Delegation.delegate({
        issuer: bob,
        audience: alice,
        capabilities: [
          {
            with: bob.did(),
            can: '*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      'store/*': [{}],
    },
    [mallory.did()]: {
      'store/add': [{ size: 100 }],
    },
    [bob.did()]: {
      'store/*': [{}],
    },
  })
})

test('expand excludes failed matches', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        with: 'ucan:*',
        can: 'store/add',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: 'store/add',
            nb: { size: 100 },
          },
          {
            with: mallory.did(),
            can: 'upload/add',
          },
        ],
      }),
      await Delegation.delegate({
        issuer: bob,
        audience: alice,
        capabilities: [
          {
            with: bob.did(),
            can: 'store/*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      'store/add': [{}],
    },
    [mallory.did()]: {
      'store/add': [{ size: 100 }],
    },
    [bob.did()]: {
      'store/add': [{}],
    },
  })
})

test('expand imposes caveats', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
        nb: {
          limit: 3,
        },
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: mallory,
        audience: alice,
        capabilities: [
          {
            with: mallory.did(),
            can: 'debug/echo',
            nb: {
              message: 'hello',
            },
          },
          {
            with: mallory.did(),
            can: 'test/echo',
          },
        ],
      }),
      await Delegation.delegate({
        issuer: bob,
        audience: alice,
        capabilities: [
          {
            with: bob.did(),
            can: '*',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      '*': [
        {
          limit: 3,
        },
      ],
    },
    [mallory.did()]: {
      'debug/echo': [{ message: 'hello', limit: 3 }],
      'test/echo': [{ limit: 3 }],
    },
    [bob.did()]: {
      '*': [
        {
          limit: 3,
        },
      ],
    },
  })
})

test('can pass multiple delegations', async () => {
  const a = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        with: alice.did(),
        can: 'store/*',
        nb: {
          size: 100,
        },
      },
    ],
  })

  const b = await Delegation.delegate({
    issuer: mallory,
    audience: bob,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: alice,
        audience: mallory,
        capabilities: [
          {
            with: alice.did(),
            can: 'upload/add',
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(a, b)), {
    [mallory.did()]: {
      '*': [{}],
    },
    [alice.did()]: {
      'store/*': [{ size: 100 }],
      'upload/add': [{}],
    },
  })
})

test('can patterns do not expand without ucan:*', async () => {
  const ucan = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        with: alice.did(),
        can: 'store/*',
      },
    ],
    proofs: [
      await Delegation.delegate({
        issuer: alice,
        audience: bob,
        capabilities: [
          {
            with: alice.did(),
            can: 'store/add',
            nb: {
              size: 100,
            },
          },
        ],
      }),
    ],
  })

  assert.deepEqual(Object(Delegation.allows(ucan)), {
    [alice.did()]: {
      'store/*': [{}],
    },
  })
})

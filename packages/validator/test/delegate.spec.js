import { capability, DID, URI, Link, Schema } from '../src/lib.js'
import { parseLink, delegate, UCAN } from '@ucanto/core'
import * as API from '@ucanto/interface'
import { Failure } from '../src/error.js'
import { test, assert } from './test.js'
import { alice, service as w3 } from './fixtures.js'

const echo = capability({
  can: 'test/echo',
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    message: URI.match({ protocol: 'data:' }),
  }),
})
const expiration = UCAN.now() + 100

test('delegate can omit constraints', async () => {
  assert.deepEqual(
    /** @type {API.Delegation} */
    (
      await echo.delegate({
        issuer: alice,
        audience: w3,
        with: alice.did(),
        nb: {
          message: 'data:1',
        },
        expiration,
      })
    ),
    await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          with: alice.did(),
          can: 'test/echo',
          nb: {
            message: 'data:1',
          },
        },
      ],
      expiration,
    })
  )
})

test('delegate can specify constraints', async () => {
  const t1 = await echo.delegate({
    with: alice.did(),
    issuer: alice,
    audience: w3,
    expiration,
  })

  assert.deepEqual(
    await echo.delegate({
      with: alice.did(),
      issuer: alice,
      audience: w3,
      expiration,
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      expiration,
      capabilities: [
        {
          with: alice.did(),
          can: 'test/echo',
        },
      ],
    })
  )
})

test('delegate fails on wrong nb', async () => {
  try {
    await echo.delegate({
      issuer: alice,
      audience: w3,
      // @ts-expect-error - not assignable to did:
      with: 'file://gozala/path',
    })
    assert.fail('must fail')
  } catch (error) {
    assert.match(
      String(error),
      /Invalid 'with' - Expected a did:key: but got "file:/
    )
  }
})

test('omits unknown nb fields', async () => {
  assert.deepEqual(
    await echo.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      expiration,
      nb: {
        // @ts-expect-error - no x expected
        x: 1,
      },
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      expiration,
      capabilities: [
        {
          with: alice.did(),
          can: 'test/echo',
        },
      ],
    })
  )
})

test('can pass undefined nb', async () => {
  assert.deepEqual(
    await echo.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: undefined,
      expiration,
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      expiration,
      capabilities: [
        {
          with: alice.did(),
          can: 'test/echo',
        },
      ],
    })
  )
})

test('can pass empty nb', async () => {
  assert.deepEqual(
    await echo.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {},
      expiration,
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      expiration,
      capabilities: [
        {
          with: alice.did(),
          can: 'test/echo',
        },
      ],
    })
  )
})

test('errors on invalid nb', async () => {
  try {
    await echo.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      expiration,
      nb: {
        // @ts-expect-error - not a data URI
        message: 'echo:foo',
      },
    })
    assert.fail('must fail')
  } catch (error) {
    assert.match(String(error), /Expected data: URI instead got echo:foo/)
  }
})

test('capability with optional caveats', async () => {
  const Echo = capability({
    can: 'test/echo',
    with: URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      message: URI.match({ protocol: 'data:' }),
      meta: Link.match().optional(),
    }),
  })

  const echo = await Echo.delegate({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'data:hello',
    },
    expiration,
  })

  assert.deepEqual(echo.capabilities, [
    {
      can: 'test/echo',
      with: alice.did(),
      nb: {
        message: 'data:hello',
      },
    },
  ])

  const link = parseLink('bafkqaaa')
  const out = await Echo.delegate({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'data:hello',
      meta: link,
    },
  })

  assert.deepEqual(out.capabilities, [
    {
      can: 'test/echo',
      with: alice.did(),
      nb: {
        message: 'data:hello',
        meta: link,
      },
    },
  ])
})

const parent = capability({
  can: 'test/parent',
  with: Schema.DID.match({ method: 'key' }),
})

const nbchild = parent.derive({
  to: capability({
    can: 'test/child',
    with: Schema.DID.match({ method: 'key' }),
    nb: Schema.struct({
      limit: Schema.integer(),
    }),
  }),
  derives: (b, a) =>
    b.with === a.with ? true : new Failure(`with don't match`),
})

const child = parent.derive({
  to: capability({
    can: 'test/child',
    with: Schema.DID.match({ method: 'key' }),
  }),
  derives: (b, a) =>
    b.with === a.with ? true : new Failure(`with don't match`),
})

test('delegate derived capability', async () => {
  assert.deepEqual(
    await child.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      expiration,
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'test/child',
          with: alice.did(),
        },
      ],
      expiration,
    })
  )
})

test('delegate derived capability omitting nb', async () => {
  assert.deepEqual(
    await nbchild.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      expiration,
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'test/child',
          with: alice.did(),
        },
      ],
      expiration,
    })
  )
})

test('delegate derived capability with nb', async () => {
  assert.deepEqual(
    await nbchild.delegate({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {
        limit: 5,
      },
      expiration,
    }),
    await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'test/child',
          with: alice.did(),
          nb: {
            limit: 5,
          },
        },
      ],
      expiration,
    })
  )
})

import { test, assert } from './test.js'
import * as JWT from '../src/jwt.js'
import { delegate, Delegation, UCAN } from '@ucanto/core'
import * as UTF8 from '../src/utf8.js'
import { alice, bob, mallory, service } from './fixtures.js'
import * as API from '@ucanto/interface'

const NOW = 1654298135

const fixtures = {
  basic: {
    cid: 'bafyreigw75rhf7gf7eubwmrhovcrdu4mfy6pfbi4wgbzlfieq2wlfsza5i',
    jwt: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsInVjdiI6IjAuOC4xIn0.eyJhdHQiOlt7ImNhbiI6InN0b3JlL2FkZCIsIndpdGgiOiJkaWQ6a2V5Ono2TWtrODliQzNKclZxS2llNzFZRWNjNU0xU01WeHVDZ054NnpMWjhTWUpzeEFMaSJ9XSwiYXVkIjoiZGlkOmtleTp6Nk1rZmZEWkNrQ1RXcmVnODg2OGZHMUZHRm9nY0pqNVg2UFk5M3BQY1dEbjlib2IiLCJleHAiOjE2NTQyOTgxMzUsImlzcyI6ImRpZDprZXk6ejZNa2s4OWJDM0pyVnFLaWU3MVlFY2M1TTFTTVZ4dUNnTng2ekxaOFNZSnN4QUxpIiwicHJmIjpbXX0.xl_SgW5QrxffsbHslb1vSX7ZAV1JbjxF1rNIAEplNPHLreHtyC3OKqneOouWjO3mqqXAcrWAsnodrBgL50VWCA',
  },
}

test('encode / decode', async () => {
  const { cid, jwt } = fixtures.basic

  const request = await JWT.encode([
    {
      issuer: alice,
      audience: bob.authority,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      expiration: NOW,
      proofs: [],
    },
  ])

  const expect = {
    body: UTF8.encode(JSON.stringify([cid])),
    headers: {
      'content-type': 'application/json',
      [`x-auth-${cid}`]: jwt,
    },
  }
  assert.deepEqual(request, expect)

  assert.deepEqual(
    await JWT.decode(request),
    [
      await Delegation.delegate({
        issuer: alice,
        audience: bob.authority,
        capabilities: [
          {
            can: 'store/add',
            with: alice.did(),
          },
        ],
        expiration: NOW,
        proofs: [],
      }),
    ],
    'roundtrips'
  )
})

test('decode requires application/json contet type', async () => {
  const { cid, jwt } = fixtures.basic

  try {
    await JWT.decode({
      body: UTF8.encode(JSON.stringify([cid])),
      headers: {
        [`x-auth-${cid}`]: jwt,
      },
    })
    assert.fail('expected to fail')
  } catch (error) {
    assert.match(String(error), /content-type: application\/json/)
  }
})

test('delegated proofs', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const outgoing = await JWT.encode([
    {
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      proofs: [proof],
      expiration,
    },
  ])

  assert.equal(Object.keys(outgoing.headers).length, 3)

  const incoming = await JWT.decode(outgoing)

  assert.deepEqual(incoming, [
    await delegate({
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [proof],
    }),
  ])

  assert.deepEqual(incoming[0].proofs, [proof])
})

test('omit proof', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const outgoing = await JWT.encode([
    {
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      proofs: [proof.cid],
      expiration,
    },
  ])

  assert.equal(Object.keys(outgoing.headers).length, 2)

  const incoming = await JWT.decode(outgoing)

  assert.deepEqual(incoming, [
    await delegate({
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      expiration,
      proofs: [proof.cid],
    }),
  ])

  assert.deepEqual(incoming[0].proofs, [proof.cid])
})

test('thorws on invalid heard', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const request = await JWT.encode([
    {
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      proofs: [proof],
      expiration,
    },
  ])

  const { [`x-auth-${proof.cid}`]: jwt, ...headers } = request.headers

  try {
    await JWT.decode({
      ...request,
      headers: {
        ...headers,
        [`x-auth-bafyreigw75rhf7gf7eubwmrhovcrdu4mfy6pfbi4wgbzlfieq2wlfsza5i`]:
          request.headers[`x-auth-${proof.cid}`],
      },
    })
    assert.fail('expected to fail')
  } catch (error) {
    assert.match(String(error), /has mismatching cid/)
  }
})

test('leaving out root throws', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const expiration = UCAN.now() + 90

  const request = await JWT.encode([
    {
      issuer: bob,
      audience: service,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
      proofs: [proof],
      expiration,
    },
  ])

  const { cid } = await delegate({
    issuer: bob,
    audience: service,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [proof],
    expiration,
  })

  const { [`x-auth-${cid}`]: jwt, ...headers } = request.headers

  try {
    await JWT.decode({
      ...request,
      headers,
    })
    assert.fail('expected to fail')
  } catch (error) {
    assert.match(String(error), /invocation .* is not provided/)
  }
})

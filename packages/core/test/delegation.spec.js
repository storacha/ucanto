import { delegate, UCAN } from '../src/lib.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { assert, test } from './test.js'
import { base64 } from 'multiformats/bases/base64'

test('toJSON delegation', async () => {
  const ucan = await delegate({
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
    expiration: Infinity,
  })

  assert.equal(
    JSON.stringify(ucan, null, 2),
    JSON.stringify(
      {
        '/': ucan.cid.toString(),
        version: ucan.version,
        issuer: alice.did(),
        audience: w3.did(),
        capabilities: [
          {
            nb: {
              message: 'data:1',
            },
            can: 'test/echo',
            with: alice.did(),
          },
        ],
        expiration: null,
        facts: [],
        proofs: [],
        signature: {
          '/': { bytes: base64.baseEncode(ucan.signature) },
        },
      },
      null,
      2
    )
  )
})

test('toJSON delegation chain', async () => {
  const proof = await delegate({
    issuer: bob,
    audience: alice,
    capabilities: [
      {
        with: bob.did(),
        can: 'test/echo',
      },
    ],
  })

  const proof2 = await delegate({
    issuer: mallory,
    audience: alice,
    capabilities: [
      {
        with: mallory.did(),
        can: 'test/echo',
      },
    ],
  })

  const ucan = await delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        with: bob.did(),
        can: 'test/echo',
        nb: {
          message: 'data:hi',
        },
      },
    ],
    proofs: [proof, proof2.cid],
  })

  assert.equal(
    JSON.stringify(ucan, null, 2),
    JSON.stringify(
      {
        '/': ucan.cid.toString(),
        version: ucan.version,
        issuer: alice.did(),
        audience: w3.did(),
        capabilities: [
          {
            nb: {
              message: 'data:hi',
            },
            can: 'test/echo',
            with: bob.did(),
          },
        ],
        expiration: ucan.expiration,
        facts: [],
        proofs: [
          {
            '/': proof.cid.toString(),
          },
          {
            '/': proof2.cid.toString(),
          },
        ],
        signature: {
          '/': { bytes: base64.baseEncode(ucan.signature) },
        },
      },
      null,
      2
    )
  )
})

import { assert, test } from './test.js'
import { Delegation, UCAN, delegate, parseLink } from '../src/lib.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { base64 } from 'multiformats/bases/base64'
const utf8 = new TextEncoder()

const link = parseLink(
  'bafybeid4cy7pj33wuead6zioxdtx3zwalhr6hd572tgqubgmy2ahrmi6vu'
)
/**
 * @param {unknown} value
 */
const toJSON = value => JSON.parse(JSON.stringify(value))

test('delegation.data.toJSON', async () => {
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  assert.deepEqual(toJSON(ucan.data), {
    v: UCAN.VERSION,
    iss: alice.did(),
    aud: bob.did(),
    att: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    exp: ucan.expiration,
    prf: [],
    s: { '/': { bytes: base64.baseEncode(ucan.signature) } },
  })
})

test('delegation.data.toJSON with proofs', async () => {
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

  const ucan = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
        root: link,
      },
    ],
    proofs: [proof],
  })

  assert.deepEqual(toJSON(ucan.data), {
    v: UCAN.VERSION,
    iss: bob.did(),
    aud: mallory.did(),
    att: [
      {
        can: 'store/add',
        with: alice.did(),
        root: { '/': link.toString() },
      },
    ],
    exp: ucan.expiration,
    prf: [
      {
        '/': proof.cid.toString(),
      },
    ],
    s: { '/': { bytes: base64.baseEncode(ucan.signature) } },
  })
})

test('delegation.data.toJSON with bytes', async () => {
  const content = utf8.encode('hello world')
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

  const ucan = await Delegation.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
        root: content,
      },
    ],
    proofs: [proof],
  })

  assert.deepEqual(toJSON(ucan.data), {
    v: UCAN.VERSION,
    iss: bob.did(),
    aud: mallory.did(),
    att: [
      {
        can: 'store/add',
        with: alice.did(),
        root: { '/': { bytes: base64.baseEncode(content) } },
      },
    ],
    exp: ucan.expiration,
    prf: [
      {
        '/': proof.cid.toString(),
      },
    ],
    s: { '/': { bytes: base64.baseEncode(ucan.signature) } },
  })
})

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

  assert.deepEqual(toJSON(ucan), {
    '/': ucan.cid.toString(),
    v: ucan.version,
    iss: alice.did(),
    aud: w3.did(),
    att: [
      {
        nb: {
          message: 'data:1',
        },
        can: 'test/echo',
        with: alice.did(),
      },
    ],
    exp: null,
    prf: [],
    s: {
      '/': { bytes: base64.baseEncode(ucan.signature) },
    },
  })
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

  assert.deepEqual(toJSON(ucan), {
    '/': ucan.cid.toString(),
    v: ucan.version,
    iss: alice.did(),
    aud: w3.did(),
    att: [
      {
        with: bob.did(),
        can: 'test/echo',
        nb: {
          message: 'data:hi',
        },
      },
    ],
    exp: ucan.expiration,
    prf: [
      {
        '/': proof.cid.toString(),
        iss: bob.did(),
        aud: alice.did(),
        att: [
          {
            with: bob.did(),
            can: 'test/echo',
          },
        ],
        exp: proof.expiration,
        v: proof.version,
        s: { '/': { bytes: base64.baseEncode(proof.signature) } },
        prf: [],
      },
      {
        '/': proof2.cid.toString(),
      },
    ],
    s: {
      '/': { bytes: base64.baseEncode(ucan.signature) },
    },
  })
})

test('.delegate() return same value', async () => {
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

  assert.equal(ucan.delegate(), ucan)
})

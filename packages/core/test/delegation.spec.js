import { assert, test } from './test.js'
import { CAR, CBOR, delegate, Delegation, parseLink, UCAN } from '../src/lib.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { base64 } from 'multiformats/bases/base64'
import { getBlock } from './utils.js'

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

test('.buildIPLDView() return same value', async () => {
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

  assert.equal(ucan.buildIPLDView(), ucan)
})

test('delegation archive', async () => {
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
  })

  const archive = await ucan.archive()
  if (archive.error) {
    return assert.fail(archive.error.message)
  }

  const extract = await Delegation.extract(archive.ok)
  if (extract.error) {
    return assert.fail(extract.error.message)
  }

  assert.deepEqual(extract.ok, ucan)
})

test('fail to extract wrong version', async () => {
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
  })

  const root = await CBOR.write({
    ['ucan@0.8.0']: ucan.root.cid,
  })
  ucan.blocks.set(`${root.cid}`, root)

  const bytes = CAR.encode({
    roots: [root],
    blocks: ucan.blocks,
  })

  const result = await Delegation.extract(bytes)
  if (result.ok) {
    return assert.fail('should not be ok')
  }

  assert.match(
    result.error.message,
    /ucan@0.9.1 instead got object with key ucan@0.8.0/
  )

  const badbytes = await Delegation.extract(new Uint8Array([0, 1, 1]))
  assert.match(badbytes.error?.message || '', /invalid car/i)

  const noroot = CAR.encode({ blocks: ucan.blocks })
  const noRootResult = await Delegation.extract(noroot)
  assert.match(noRootResult.error?.message || '', /does not contain a root/i)

  const nonvariantroot = await Delegation.extract(
    CAR.encode({
      roots: [ucan.root],
      blocks: ucan.blocks,
    })
  )

  assert.match(nonvariantroot.error?.message || '', /object with a single key/i)

  const okroot = await CBOR.write({
    ['ucan@0.9.1']: ucan.root.cid,
  })

  const missingblocks = await Delegation.extract(
    CAR.encode({ roots: [okroot] })
  )

  assert.match(missingblocks.error?.message || '', /Block .* not found/i)
})

test('fail archive with bad input', async () => {
  const result = await Delegation.archive(
    // @ts-expect-error
    {}
  )
  assert.equal(result.error instanceof Error, true)
})

test('archive delegation chain', async () => {
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

  const archive = await ucan.archive()
  if (archive.error) {
    return assert.fail(archive.error.message)
  }

  const extract = await Delegation.extract(archive.ok)
  if (extract.error) {
    return assert.fail(extract.error.message)
  }

  assert.deepEqual(extract.ok, ucan)
  assert.deepEqual(extract.ok.proofs[0], proof)
})

test('delegation.attach block in capabiliy', async () => {
  const block = await getBlock({ test: 'inlineBlock' })
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
        nb: {
          inlineBlock: block.cid.link(),
        },
      },
    ],
  })

  ucan.attach(block)

  const delegationBlocks = []
  for (const b of ucan.iterateIPLDBlocks()) {
    delegationBlocks.push(b)
  }

  assert.ok(delegationBlocks.find(b => b.cid.equals(block.cid)))
})

test('delegation.attach block in facts', async () => {
  const block = await getBlock({ test: 'inlineBlock' })
  const ucan = await Delegation.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    facts: [
      { [`${block.cid.link()}`]: block.cid.link() },
      // @ts-expect-error Link has fact entry
      block.cid.link(),
    ],
  })

  ucan.attach(block)

  const delegationBlocks = []
  for (const b of ucan.iterateIPLDBlocks()) {
    delegationBlocks.push(b)
  }

  assert.ok(delegationBlocks.find(b => b.cid.equals(block.cid)))
})

test('delegation.attach fails to attach block with not attached link', async () => {
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

  const block = await getBlock({ test: 'inlineBlock' })
  assert.throws(() => ucan.attach(block))
})

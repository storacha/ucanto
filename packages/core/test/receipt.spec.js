import { Receipt, invoke, API, delegate } from '../src/lib.js'
import { alice, bob, service as w3 } from './fixtures.js'
import { assert, test } from './test.js'
import * as CBOR from '../src/cbor.js'

test('basic receipt', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  const receipt = await Receipt.issue({
    issuer: w3,
    result: { ok: { hello: 'message' } },
    ran: invocation,
  })

  await assertReceipt(receipt, {
    out: { ok: { hello: 'message' } },
    meta: {},
    fx: { fork: [] },
    ran: invocation,
    issuer: w3,
    verifier: w3,
    proofs: [],
  })

  await assertRoundtrip(receipt)

  assert.equal(receipt.buildIPLDView().buildIPLDView(), receipt)
})

test('receipt with ran as link', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  const receipt = await Receipt.issue({
    issuer: w3,
    result: { ok: { hello: 'message' } },
    ran: invocation.link(),
  })

  await assertReceipt(receipt, {
    out: { ok: { hello: 'message' } },
    meta: {},
    fx: { fork: [] },
    ran: invocation.link(),
    issuer: w3,
    verifier: w3,
    proofs: [],
  })

  await assertRoundtrip(receipt)
})

test('receipt with proofs', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  const proof = await delegate({
    issuer: w3,
    audience: bob,
    capabilities: [
      {
        with: w3.did(),
        can: '*',
      },
    ],
  })

  const { cid: proofCid } = await await delegate({
    issuer: w3,
    audience: bob,
    capabilities: [
      {
        with: w3.did(),
        can: '*',
      },
    ],
    nonce: 'second one',
  })

  const receipt = await Receipt.issue({
    issuer: bob,
    result: { ok: { hello: 'message' } },
    ran: invocation,
    proofs: [proof, proofCid],
  })

  await assertReceipt(receipt, {
    out: { ok: { hello: 'message' } },
    meta: {},
    fx: { fork: [] },
    ran: invocation,
    issuer: bob,
    verifier: bob,
    proofs: [proof, proofCid],
  })

  await assertRoundtrip(receipt)
})

test('receipt with meta', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  const receipt = await Receipt.issue({
    issuer: w3,
    result: { ok: { hello: 'message' } },
    ran: invocation,
    meta: { test: 'metadata' },
  })

  await assertReceipt(receipt, {
    out: { ok: { hello: 'message' } },
    meta: { test: 'metadata' },
    fx: { fork: [] },
    ran: invocation,
    issuer: w3,
    verifier: w3,
    proofs: [],
  })

  await assertRoundtrip(receipt)
})

test('receipt with fx.fork', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  const echo = await CBOR.write(
    /** @type {API.InstructionModel} */ ({
      op: 'debug/echo',
      rsc: alice.did(),
      input: {},
      nnc: '',
    })
  )

  const receipt = await Receipt.issue({
    issuer: w3,
    result: { ok: { hello: 'message' } },
    ran: invocation,
    meta: { test: 'metadata' },
    fx: {
      fork: [echo.cid],
    },
  })

  await assertReceipt(receipt, {
    out: { ok: { hello: 'message' } },
    meta: { test: 'metadata' },
    fx: {
      fork: [echo.cid],
    },
    ran: invocation,
    issuer: w3,
    verifier: w3,
    proofs: [],
  })

  await assertRoundtrip(receipt)
})

test('receipt with fx.join', async () => {
  const invocation = await invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/echo',
      with: alice.did(),
    },
  }).delegate()

  const echo = await CBOR.write(
    /** @type {API.InstructionModel} */ ({
      op: 'debug/echo',
      rsc: alice.did(),
      input: {},
      nnc: '',
    })
  )

  const receipt = await Receipt.issue({
    issuer: w3,
    result: { ok: { hello: 'message' } },
    ran: invocation,
    meta: { test: 'metadata' },
    fx: {
      fork: [],
      join: echo.cid,
    },
  })

  await assertReceipt(receipt, {
    out: { ok: { hello: 'message' } },
    meta: { test: 'metadata' },
    fx: {
      fork: [],
      join: echo.cid,
    },
    ran: invocation,
    issuer: w3,
    verifier: w3,
    proofs: [],
  })

  await assertRoundtrip(receipt)
})

/**
 * @template {API.Receipt} Receipt
 * @param {Receipt} receipt
 * @param {Partial<Receipt> & { verifier?: API.Verifier }} expect
 */
const assertReceipt = async (receipt, expect) => {
  if (expect.out) {
    assert.deepEqual(receipt.out, expect.out, 'out is correct')
  }

  if (expect.meta) {
    assert.deepEqual(receipt.meta, expect.meta, 'meta is correct')
  }

  if (expect.fx) {
    assert.deepEqual(receipt.fx, expect.fx, 'fx is correct')
  }

  if (expect.issuer) {
    assert.deepEqual(
      receipt.issuer?.did(),
      expect.issuer.did(),
      'issuer is correct'
    )
  }

  if (expect.ran) {
    assert.deepEqual(receipt.ran, expect.ran, 'ran field is correct')
  }

  if (expect.verifier) {
    assert.deepEqual(
      await receipt.verifySignature(expect.verifier),
      { ok: {} },
      'signature is valid'
    )
  }

  if (expect.proofs) {
    assert.deepEqual(receipt.proofs, expect.proofs, 'proofs are correct')
  }
}

/**
 * @template {API.Receipt} Receipt
 * @param {Receipt} receipt
 */
const assertRoundtrip = async receipt => {
  const blocks = new Map()
  for await (const block of receipt.iterateIPLDBlocks()) {
    blocks.set(block.cid.toString(), block)
  }

  const view = Receipt.view({ root: receipt.root.cid, blocks })
  assert.deepEqual(view.out, receipt.out)
  assert.deepEqual(view.meta, receipt.meta)
  assert.deepEqual(view.fx, receipt.fx)
  assert.deepEqual(view.ran, receipt.ran)
  assert.deepEqual(view.issuer, receipt.issuer)
  assert.deepEqual(view.proofs, receipt.proofs)
  assert.deepEqual(view.signature, receipt.signature)
}

import {
  Message,
  Receipt,
  invoke,
  API,
  delegate,
  DAG,
  UCAN,
} from '../src/lib.js'
import { alice, bob, service as w3 } from './fixtures.js'
import { assert, test } from './test.js'
import * as CBOR from '../src/cbor.js'

test('build empty message', async () => {
  const message = await Message.build({})
  assert.deepEqual(message.invocations, [])
  assert.deepEqual(message.receipts.size, 0)

  assert.deepEqual(message.invocationLinks, [])
})

test('build message with an invocation', async () => {
  const echo = await build({
    run: {
      can: 'test/echo',
      message: 'hello',
    },
    result: {
      ok: { message: 'hello' },
    },
  })

  const message = await Message.build({
    invocations: [echo.invocation],
  })

  assert.deepEqual(message.root.data, {
    'ucanto/message@7.0.0': {
      execute: [echo.delegation.cid],
    },
  })
  assert.deepEqual(message.invocationLinks, [echo.delegation.cid])

  const store = DAG.createStore([...message.iterateIPLDBlocks()])

  const view = Message.view({
    root: message.root.cid,
    store,
  })

  assert.deepEqual(view.invocations, [echo.delegation])
  assert.deepEqual(
    view.invocations[0].proofs,
    [echo.proof],
    'proofs are included'
  )

  assert.deepEqual(view.receipts.size, 0)
  assert.deepEqual([...view.iterateIPLDBlocks()].length, store.size)
})

test('Message.view', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const bye = await build({ run: { can: 'test/bye' } })

  const store = DAG.createStore([
    ...hi.delegation.iterateIPLDBlocks(),
    ...bye.delegation.iterateIPLDBlocks(),
  ])

  const buildHi = await Message.build({
    invocations: [hi.invocation],
  })

  assert.throws(
    () =>
      Message.view({
        root: buildHi.root.cid,
        store,
      }),
    /Block for the bafy.* not found/
  )

  assert.deepEqual(
    Message.view(
      {
        root: buildHi.root.cid,
        store,
      },
      null
    ),
    null
  )

  DAG.addInto(buildHi.root, store)
  const viewHi = Message.view({
    root: buildHi.root.cid,
    store,
  })

  assert.deepEqual(buildHi.invocations, viewHi.invocations)
  assert.deepEqual([...viewHi.iterateIPLDBlocks()].length < store.size, true)

  assert.throws(
    () =>
      Message.view({
        root: hi.delegation.cid,
        store,
      }),
    /Expected an object with a single key/,
    'throws if message does not match schema'
  )

  assert.deepEqual(
    Message.view(
      {
        root: hi.delegation.cid,
        store,
      },
      { another: 'one' }
    ),
    { another: 'one' }
  )
})

test('empty receipts are omitted', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const message = await Message.build({
    invocations: [hi.delegation],
    // @ts-expect-error - requires at least on item
    receipts: [],
  })

  assert.deepEqual(
    message.root.data,
    {
      'ucanto/message@7.0.0': {
        execute: [hi.delegation.cid],
      },
    },
    'receipts are omitted'
  )

  assert.equal(message.get(hi.delegation.cid, null), null)
})

test('message with receipts', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const message = await Message.build({
    receipts: [hi.receipt],
  })

  assert.deepEqual(
    message.root.data,
    {
      'ucanto/message@7.0.0': {
        report: {
          [`${hi.delegation.cid}`]: hi.receipt.root.cid,
        },
      },
    },
    'includes passed receipt'
  )
})

test('handles duplicate receipts', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const message = await Message.build({
    receipts: [hi.receipt, hi.receipt],
  })

  assert.deepEqual(
    message.root.data,
    {
      'ucanto/message@7.0.0': {
        report: {
          [`${hi.delegation.cid}`]: hi.receipt.root.cid,
        },
      },
    },
    'includes passed receipt'
  )

  assert.deepEqual([...message.receipts.values()], [hi.receipt, hi.receipt])
})

test('empty invocations are omitted', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const message = await Message.build({
    receipts: [hi.receipt],
    // @ts-expect-error - requires non empty invocations
    invocations: [],
  })

  assert.deepEqual(
    message.root.data,
    {
      'ucanto/message@7.0.0': {
        report: {
          [`${hi.delegation.cid}`]: hi.receipt.root.cid,
        },
      },
    },
    'empty invocations are omitted'
  )

  const receipt = message.get(hi.delegation.cid)
  assert.deepEqual(receipt.root, hi.receipt.root)

  assert.throws(
    () => message.get(receipt.root.cid),
    /does not include receipt for/
  )
})

// test('message with invocations & inline links', async () => {
//   const link = await Block.encode({
//     value: { test: 'inlineLinks ' },
//     codec,
//     hasher,
//   })

//   const hi = await build({
//     run: {
//       can: 'test/hi',
//       nb: {
//         link: link.cid,
//       },
//     },
//     inlineLinks: [link],
//   })
//   const message = await Message.build({
//     receipts: [hi.receipt],
//     invocations: [hi.invocation],
//   })

//   assert.deepEqual(
//     message.root.data,
//     {
//       'ucanto/message@7.0.0': {
//         execute: [hi.delegation.cid],
//         report: {
//           [`${hi.delegation.cid}`]: hi.receipt.root.cid,
//         },
//       },
//     },
//     'contains invocations'
//   )

//   const cids = new Set(
//     [...message.iterateIPLDBlocks()].map($ => $.cid.toString())
//   )

//   assert.deepEqual(cids.has(hi.delegation.cid.toString()), true)
//   assert.deepEqual(cids.has(link.cid.toString()), true, 'contains inline links')
//   assert.deepEqual(cids.has(message.root.cid.toString()), true)
// })

test('message with invocations & receipts', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const message = await Message.build({
    receipts: [hi.receipt],
    invocations: [hi.invocation],
  })

  assert.deepEqual(
    message.root.data,
    {
      'ucanto/message@7.0.0': {
        execute: [hi.delegation.cid],
        report: {
          [`${hi.delegation.cid}`]: hi.receipt.root.cid,
        },
      },
    },
    'contains invocations and receipts'
  )

  const cids = new Set(
    [...message.iterateIPLDBlocks()].map($ => $.cid.toString())
  )

  assert.deepEqual(cids.has(hi.delegation.cid.toString()), true)
  assert.deepEqual(cids.has(hi.proof.cid.toString()), true)
  assert.deepEqual(cids.has(hi.receipt.root.cid.toString()), true)
  assert.deepEqual(cids.has(message.root.cid.toString()), true)
})

test('Message.view with receipts', async () => {
  const hi = await build({ run: { can: 'test/hi' } })
  const bye = await build({ run: { can: 'test/bye' } })

  const message = await Message.build({
    invocations: [hi.invocation],
    receipts: [hi.receipt, bye.receipt],
  })

  const store = DAG.createStore([...message.iterateIPLDBlocks()])

  const view = Message.view({
    root: message.root.cid,
    store,
  })

  assert.deepEqual(
    [...view.receipts.entries()]
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, $]) => [key, $.root]),
    [...message.receipts.entries()]
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, $]) => [key, $.root])
  )

  assert.deepEqual(view.invocations, message.invocations)
})

/**
 * @template {Omit<API.Capability, 'with'>} I
 * @param {object} source
 * @param {I} source.run
 * @param {Record<string, unknown>} [source.meta]
 * @param {API.Result<{}, {}>} [source.result]
 */
const build = async ({
  run,
  result = { ok: {} },
  meta = { test: 'metadata' },
}) => {
  const proof = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [{ with: alice.did(), can: run.can }],
    expiration: UCAN.now() + 1000,
  })

  const invocation = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      ...run,
      with: alice.did(),
    },
    proofs: [proof],
  })

  const delegation = await invocation.buildIPLDView()
  const receipt = await Receipt.issue({
    issuer: w3,
    result,
    ran: delegation.link(),
    meta,
    fx: {
      fork: [],
    },
  })

  return { proof, invocation, delegation, receipt }
}

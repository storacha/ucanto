import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import { delegate, invoke, Receipt, Message, UCAN } from '@ucanto/core'
import { alice, bob, service } from './fixtures.js'
import * as API from '@ucanto/interface'

test('encode / decode', async () => {
  const { message, delegation, outgoing, incoming } = await setup()

  assert.deepEqual(outgoing.headers, {
    'content-type': 'application/vnd.ipld.car',
    accept: 'application/vnd.ipld.car',
  })

  assertDecode(incoming, {
    root: message.root,
    data: {
      'ucanto/message@7.0.0': {
        execute: [delegation.cid],
      },
    },
  })
})

test('accepts Content-Type as well', async () => {
  const { message, delegation, outgoing } = await setup()

  assertDecode(
    await CAR.request.decode({
      ...outgoing,
      headers: {
        'Content-Type': 'application/car',
      },
    }),
    {
      root: message.root,
      data: {
        'ucanto/message@7.0.0': {
          execute: [delegation.cid],
        },
      },
    }
  )

  assert.deepEqual(message.invocations[0].bytes, delegation.bytes)
})

test('delegated proofs', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const { invocation, incoming } = await setup({ proofs: [proof] })

  const { invocations } = incoming
  assert.deepEqual(invocations, [await invocation.delegate()])

  assert.deepEqual(invocations[0].proofs, [proof])
})

test('omit proof', async () => {
  const proof = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const { incoming } = await setup({ proofs: [proof.cid] })

  const { invocations } = incoming
  assert.deepEqual(invocations, [
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

  assert.deepEqual(invocations[0].proofs, [proof.cid])
})

test('CAR.request encode / decode', async () => {
  const { outgoing, incoming, message, delegation } = await setup()

  assert.deepEqual(outgoing.headers, {
    'content-type': 'application/vnd.ipld.car',
    accept: 'application/vnd.ipld.car',
  })

  assertDecode(incoming, {
    root: message.root,
    data: {
      'ucanto/message@7.0.0': {
        execute: [delegation.cid],
      },
    },
  })
})

test('CAR.response encode/decode', async () => {
  const ran = await invoke({
    issuer: bob,
    audience: service,
    capability: {
      can: 'test/hello',
      with: alice.did(),
    },
  }).delegate()

  const receipt = await Receipt.issue({
    issuer: alice,
    result: {
      ok: { hello: 'world' },
    },
    ran,
    meta: { test: 'run' },
  })

  const message = await Message.build({ receipts: [receipt] })
  const request = CAR.response.encode(message)
  assert.deepEqual(request.headers, {
    'content-type': 'application/vnd.ipld.car',
  })

  const replica = await CAR.response.decode(request)
  const [received, ...receipts] = replica.receipts.values()

  assert.equal(receipts.length, 0)
  assert.deepEqual(received.issuer, receipt.issuer)
  assert.deepEqual(received.meta, receipt.meta)
  assert.deepEqual(received.ran, receipt.ran)
  assert.deepEqual(received.proofs, receipt.proofs)
  assert.deepEqual(received.fx, receipt.fx)
  assert.deepEqual(
    received.signature,
    /** @type {object} */ (receipt.signature)
  )
})

const expiration = UCAN.now() + 90

/**
 * @param {object} source
 * @param {API.Proof[]} [source.proofs]
 */
const setup = async ({ proofs = [] } = {}) => {
  const invocation = invoke({
    issuer: bob,
    audience: service,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    expiration,
    proofs,
  })
  const delegation = await invocation.delegate()
  const message = await Message.build({ invocations: [invocation] })
  const outgoing = await CAR.request.encode(message)
  const incoming = await CAR.request.decode(outgoing)

  return { invocation, delegation, message, outgoing, incoming }
}

/**
 * @param {API.AgentMessage} actual
 * @param {object} expect
 * @param {API.Block} expect.root
 * @param {API.AgentMessageModel<*>} expect.data
 */
const assertDecode = (actual, expect) => {
  assert.deepEqual(actual.root, expect.root, 'roundtrips')
  assert.deepEqual(actual.root.data, expect.data)
}

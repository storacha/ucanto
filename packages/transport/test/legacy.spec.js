import * as API from '@ucanto/interface'
import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import * as Legacy from '../src/legacy.js'
import { invoke, Receipt, Message, CBOR } from '@ucanto/core'
import { alice, bob, service } from './fixtures.js'

test('Legacy decode / encode', async () => {
  const expiration = 1654298135
  const invocation = invoke({
    issuer: alice,
    audience: bob,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    expiration,
    proofs: [],
  })
  const message = await Message.build({
    invocations: [invocation],
  })

  const source = await CAR.outbound.encode(message)

  const accept = await Legacy.inbound.accept({
    headers: { 'content-type': 'application/vnd.ipld.car' },
    body: source.body,
  })
  if (accept.error) {
    return assert.equal(accept.error, undefined)
  }
  const { encoder, decoder } = accept.ok

  const request = await decoder.decode(source)

  const expect = await invocation.delegate()
  assert.deepEqual(
    [expect.link()],
    request.invocations.map($ => $.link()),
    'roundtrips'
  )

  const success = await Receipt.issue({
    ran: expect.cid,
    issuer: bob,
    result: { ok: { hello: 'message' } },
  })

  const failure = await Receipt.issue({
    ran: expect.cid,
    issuer: bob,
    result: { error: { message: 'Boom' } },
  })

  const output = await Message.build({ receipts: [success, failure] })
  const response = await encoder.encode(output)
  const results = await CBOR.decode(response.body)

  assert.deepEqual(
    results,
    // @ts-expect-error - we want to return to old clients.
    [{ hello: 'message' }, { error: true, message: 'Boom' }],
    'roundtrips'
  )
})

test('decode legacy invocation format', async () => {
  const expiration = 1654298135
  const add = await invoke({
    issuer: alice,
    audience: service,
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    expiration,
    proofs: [],
  }).buildIPLDView()

  const greet = await invoke({
    issuer: alice,
    audience: service,
    capability: {
      can: 'test/echo',
      with: 'data:hello',
    },
    expiration,
    proofs: [],
  }).buildIPLDView()

  const roots = [add, greet]
  const blocks = new Map()
  for (const root of roots) {
    for (const block of root.iterateIPLDBlocks()) {
      blocks.set(`${block.cid}`, block)
    }
  }

  const request = {
    headers: { 'content-type': 'application/car' },
    body: /** @type {Uint8Array} */ (await CAR.codec.encode({ roots, blocks })),
  }

  const codec = Legacy.inbound.accept(request)
  if (codec.error) {
    return assert.fail('expected to accept legacy invocation')
  }
  const message = await codec.ok.decoder.decode(request)

  assert.deepEqual(message.invocations, roots)
})

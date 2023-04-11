import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import * as Transport from '../src/lib.js'
import { alice, bob } from './fixtures.js'
import { invoke, delegate, parseLink, Receipt, Message } from '@ucanto/core'

test('unsupported inbound content-type', async () => {
  const accept = CAR.inbound.accept({
    headers: { 'content-type': 'application/car' },
    body: new Uint8Array(),
  })

  assert.deepEqual(accept, {
    error: {
      status: 415,
      message: `The server cannot process the request because the payload format is not supported. Please check the content-type header and try again with a supported media type.`,
      headers: {
        accept: 'application/vnd.ipld.car',
      },
    },
  })
})

test('unsupported inbound accept type', async () => {
  const accept = CAR.inbound.accept({
    headers: {
      'content-type': 'application/vnd.ipld.car',
      accept: 'application/car',
    },
    body: new Uint8Array(),
  })

  assert.deepEqual(accept, {
    error: {
      status: 406,
      message: `The requested resource cannot be served in the requested content type. Please specify a supported content type using the Accept header.`,
      headers: {
        accept: `application/vnd.ipld.car`,
      },
    },
  })
})

test(`requires encoders / decoders`, async () => {
  assert.throws(
    () =>
      Transport.outbound({ encoders: { '*/*': CAR.request }, decoders: {} }),
    /At least one decoder MUST be provided/
  )

  assert.throws(
    () =>
      Transport.outbound({ encoders: {}, decoders: { '*/*': CAR.response } }),
    /At least one encoder MUST be provided/
  )

  assert.throws(
    () =>
      Transport.inbound({ encoders: { '*/*': CAR.response }, decoders: {} }),
    /At least one decoder MUST be provided/
  )

  assert.throws(
    () => Transport.inbound({ encoders: {}, decoders: { '*/*': CAR.request } }),
    /At least one encoder MUST be provided/
  )
})

test('outbound encode', async () => {
  const expiration = 1654298135
  const message = await Message.build({
    invocations: [
      invoke({
        issuer: alice,
        audience: bob,
        capability: {
          can: 'store/add',
          with: alice.did(),
        },
        expiration,
        proofs: [],
      }),
    ],
  })

  const request = await CAR.outbound.encode(message)

  assert.deepEqual(request.headers, {
    'content-type': 'application/vnd.ipld.car',
    accept: 'application/vnd.ipld.car',
  })

  assert.deepEqual(
    message.root,
    (await CAR.inbound.accept(request).ok?.decoder.decode(request))?.root,
    'roundtrips'
  )
})

test('outbound decode', async () => {
  const { success, failure } = await setup()
  const message = await Message.build({ receipts: [success, failure] })

  const response = await CAR.response.encode(message)
  const replica = await CAR.outbound.decode(response)

  assert.deepEqual(
    [...replica.receipts.keys()],
    [success.ran.link().toString(), failure.ran.link().toString()]
  )
})

test('inbound supports Content-Type header', async () => {
  const accept = await CAR.inbound.accept({
    headers: { 'Content-Type': 'application/vnd.ipld.car' },
    body: new Uint8Array(),
  })

  assert.equal(accept.ok != null, true)
})

test('outbound supports Content-Type header', async () => {
  const { success } = await setup()
  const message = await Message.build({ receipts: [success] })
  const { body } = await CAR.response.encode(message)

  const replica = await CAR.outbound.decode({
    headers: { 'Content-Type': 'application/vnd.ipld.car' },
    body,
  })

  assert.deepEqual(replica.get(success.ran.link()).root, success.root)
})

test('inbound encode preference', async () => {
  const codec = Transport.inbound({
    encoders: {
      'application/car': CAR.response,
    },
    decoders: {
      'application/car': CAR.request,
    },
  })

  const accept = await codec.accept({
    headers: {
      'content-type': 'application/car',
      accept: 'application/car',
    },
    body: new Uint8Array(),
  })

  assert.equal(accept.ok != null, true)
})

test('unsupported response content-type', async () => {
  const { success } = await setup()
  const message = await Message.build({ receipts: [success] })

  const response = await CAR.response.encode(message)

  const badContentType = await wait(() =>
    CAR.outbound.decode({
      ...response,
      headers: { ...response.headers, 'content-type': 'application/json' },
    })
  ).catch(error => error)

  assert.match(
    String(badContentType),
    /Can not decode response with content-type 'application\/json'/
  )

  const badStatus = await wait(() =>
    CAR.outbound.decode({
      ...response,
      headers: { ...response.headers, 'content-type': 'text/plain' },
      status: 415,
      body: new TextEncoder().encode('Whatever server sets'),
    })
  ).catch(error => error)

  assert.match(String(badStatus), /Whatever server sets/)
  assert.equal(Object(badStatus).status, 415)
})

test('format media type', async () => {
  assert.equal(
    Transport.formatMediaType({
      category: 'application',
      type: 'car',
      preference: 1,
    }),
    'application/car;q=1'
  )
})

const setup = async () => {
  const expiration = 1654298135
  const hi = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    expiration,
    proofs: [],
  })

  const boom = await delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'debug/error',
        with: alice.did(),
      },
    ],
    expiration,
    proofs: [],
  })

  const success = await Receipt.issue({
    ran: hi.cid,
    issuer: bob,
    result: { ok: { hello: 'message' } },
  })

  const failure = await Receipt.issue({
    ran: boom.cid,
    issuer: bob,
    result: { error: { message: 'Boom' } },
  })

  return { hi, boom, success, failure }
}

/**
 * @template {(...args:any[]) => any} Fn
 * @param {Fn} fn
 */
const wait = async fn => fn()

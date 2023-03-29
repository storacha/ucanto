import { test, assert } from './test.js'
import * as CAR from '../src/car.js'
import * as Transport from '../src/lib.js'
import { alice, bob } from './fixtures.js'
import { invoke, delegate, parseLink, Receipt } from '@ucanto/core'

test('unsupported inbound content-type', async () => {
  const accept = CAR.inbound.accept({
    headers: { 'content-type': 'application/json' },
    body: new Uint8Array(),
  })

  assert.deepEqual(accept, {
    error: {
      status: 415,
      message: `The server cannot process the request because the payload format is not supported. Please check the content-type header and try again with a supported media type.`,
      headers: {
        accept: `application/car`,
      },
    },
  })
})

test('unsupported inbound accept type', async () => {
  const accept = CAR.inbound.accept({
    headers: { 'content-type': 'application/car', accept: 'application/cbor' },
    body: new Uint8Array(),
  })

  assert.deepEqual(accept, {
    error: {
      status: 406,
      message: `The requested resource cannot be served in the requested content type. Please specify a supported content type using the Accept header.`,
      headers: {
        accept: `application/car`,
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
  const cid = parseLink(
    'bafyreiaxnmoptsqiehdff2blpptvdbenxcz6xgrbojw5em36xovn2xea4y'
  )
  const expiration = 1654298135

  const request = await CAR.outbound.encode([
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
  ])

  assert.deepEqual(request.headers, {
    'content-type': 'application/car',
    accept: 'application/car',
  })

  const expect = await delegate({
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

  assert.deepEqual(
    [expect],
    await CAR.inbound.accept(request).ok?.decoder.decode(request),
    'roundtrips'
  )
})

test('outbound decode', async () => {
  const { success, failure } = await buildPayload()

  const response = await CAR.response.encode([success, failure])
  const receipts = await CAR.outbound.decode(response)

  assert.deepEqual(
    receipts.map($ => $.root),
    [success.root, failure.root]
  )
})

test('inbound supports Content-Type header', async () => {
  const accept = await CAR.inbound.accept({
    headers: { 'Content-Type': 'application/car' },
    body: new Uint8Array(),
  })

  assert.equal(accept.ok != null, true)
})

test('outbound supports Content-Type header', async () => {
  const { success } = await buildPayload()
  const { body } = await CAR.response.encode([success])

  const receipts = await CAR.outbound.decode({
    headers: { 'Content-Type': 'application/car' },
    body,
  })

  assert.deepEqual(receipts[0].root, success.root)
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
  const { success } = await buildPayload()

  const response = await CAR.response.encode([success])

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

const buildPayload = async () => {
  const expiration = 1654298135
  const ran = await delegate({
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

  const success = await Receipt.issue({
    ran: ran.cid,
    issuer: bob,
    result: { ok: { hello: 'message' } },
  })

  const failure = await Receipt.issue({
    ran: ran.cid,
    issuer: bob,
    result: { error: { message: 'Boom' } },
  })

  return { ran, success, failure }
}

/**
 * @template {(...args:any[]) => any} Fn
 * @param {Fn} fn
 */
const wait = async fn => fn()

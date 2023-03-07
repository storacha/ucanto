import { test, assert } from './test.js'
import { access, DID } from '../src/lib.js'
import { capability, URI, Link, Schema } from '../src/lib.js'
import { Failure } from '../src/error.js'
import { ed25519, Verifier, Absentee } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import * as Core from '@ucanto/core'
import * as CBOR from '@ipld/dag-cbor'
import { Delegation } from '@ucanto/core'
import { base64 } from 'multiformats/bases/base64'

import { alice, bob, mallory, service } from './fixtures.js'
const w3 = service.withDID('did:web:web3.storage')

const echo = capability({
  can: 'debug/echo',
  with: DID.match({ method: 'mailto' }),
  nb: Schema.struct({
    message: Schema.string().optional(),
  }),
})

const attest = capability({
  can: 'ucan/attest',
  with: DID,
  nb: Schema.struct({
    proof: Schema.link(),
  }),
})

test('validate mailto', async () => {
  const agent = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const session = await attest.delegate({
    issuer: w3,
    audience: agent,
    with: w3.did(),
    nb: { proof: proof.cid },
    expiration: Infinity,
  })

  const task = echo.invoke({
    issuer: agent,
    audience: w3,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [proof, session],
    expiration: Infinity,
  })

  const result = await access(await task.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.containSubset(result, {
    match: {
      value: {
        can: 'debug/echo',
        with: account.did(),
        nb: {
          message: 'hello world',
        },
      },
    },
  })
})

test('delegated ucan/attest', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const agent = alice
  const manager = await ed25519.generate()
  const worker = await ed25519.generate()

  const authority = await Core.delegate({
    issuer: manager,
    audience: worker,
    capabilities: [
      {
        with: w3.did(),
        can: '*',
      },
    ],
    expiration: Infinity,
    proofs: [
      await Core.delegate({
        issuer: w3,
        audience: manager,
        capabilities: [
          {
            with: w3.did(),
            can: '*',
          },
        ],
      }),
    ],
  })

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  assert.deepEqual(
    proof.signature,
    base64.baseDecode('gKADAA'),
    'should have blank signature'
  )

  const session = await Delegation.delegate({
    issuer: worker,
    audience: agent,
    capabilities: [
      {
        with: w3.did(),
        can: 'ucan/attest',
        nb: { proof: proof.cid },
      },
    ],
    proofs: [authority],
  })

  const request = echo.invoke({
    audience: w3,
    issuer: agent,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [session, proof],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.containSubset(result, {
    match: {
      value: {
        can: 'debug/echo',
        with: account.did(),
        nb: {
          message: 'hello world',
        },
      },
    },
  })
})

test('fail without proofs', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })

  const inv = echo.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
    nb: { message: 'hello world' },
  })

  const result = await access(await inv.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
  })

  assert.match(
    result.toString(),
    /Unable to resolve 'did:mailto:web.mail:alice'/
  )
})

test('fail without session', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const agent = alice

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const inv = echo.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [proof],
  })

  const result = await access(await inv.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
  })

  assert.match(
    result.toString(),
    /Unable to resolve 'did:mailto:web.mail:alice'/
  )
})

test('fail invalid ucan/attest proof', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const agent = alice
  const service = await ed25519.generate()

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const session = await Delegation.delegate({
    issuer: service,
    audience: agent,
    capabilities: [
      {
        with: w3.did(),
        can: 'ucan/attest',
        nb: { proof: proof.cid },
      },
    ],
    proofs: [
      await Core.delegate({
        issuer: w3,
        audience: service,
        capabilities: [
          {
            // Noting that this is a DID key, not did:web:web3.storage
            // which is why session is invalid
            with: w3.toDIDKey(),
            can: '*',
          },
        ],
      }),
    ],
  })

  const request = echo.invoke({
    audience: w3,
    issuer: agent,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [proof, session],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
  })

  assert.match(result.toString(), /has an invalid session/)
})

test('resolve key', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')

  const inv = echo.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
    nb: { message: 'hello world' },
  })

  const result = await access(await inv.delegate(), {
    authority: w3,
    capability: echo,
    resolveDIDKey: _ => alice.did(),
    principal: Verifier,
  })

  assert.containSubset(result, {
    match: {
      value: {
        can: 'debug/echo',
        with: account.did(),
        nb: {
          message: 'hello world',
        },
      },
    },
  })
})

test('service can not delegate access to account', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  // service should not be able to delegate access to account resource
  const auth = await Delegation.delegate({
    issuer: w3,
    audience: alice,
    capabilities: [
      {
        with: account.did(),
        can: 'debug/echo',
      },
    ],
  })

  const session = await Delegation.delegate({
    issuer: service,
    audience: alice,
    capabilities: [
      {
        with: w3.did(),
        can: 'ucan/attest',
        nb: { proof: auth.cid },
      },
    ],
    proofs: [auth],
  })

  const request = echo.invoke({
    audience: w3,
    issuer: alice,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [auth, session],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.equal(result.error, true)
})

test('attest with an account did', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })

  // service should not be able to delegate access to account resource
  const auth = await Delegation.delegate({
    issuer: w3,
    audience: alice,
    capabilities: [
      {
        with: account.did(),
        can: 'debug/echo',
      },
    ],
  })

  const session = await Delegation.delegate({
    issuer: w3,
    audience: alice,
    capabilities: [
      {
        // this should be an service did instead
        with: account.did(),
        can: 'ucan/attest',
        nb: { proof: auth.cid },
      },
    ],
  })

  const request = echo.invoke({
    audience: w3,
    issuer: alice,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [auth, session],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
  })

  assert.equal(result.error, true)
})

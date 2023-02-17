import { test, assert } from './test.js'
import { access, DID } from '../src/lib.js'
import { capability, URI, Link, Schema } from '../src/lib.js'
import { Failure } from '../src/error.js'
import { ed25519, Verifier } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import * as Core from '@ucanto/core'
import * as CBOR from '@ipld/dag-cbor'
import { Delegation } from '@ucanto/core'

import { alice, bob, mallory, service } from './fixtures.js'
const w3 = service.withDID('did:web:web3.storage')

const claim = capability({
  can: 'access/claim',
  with: DID.match({ method: 'mailto' }),
})

const update = capability({
  can: './update',
  with: DID,
  nb: Schema.struct({
    authorization: Schema.link(),
  }),
})

test('validate mailto', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')
  const proof = await Delegation.permit({
    issuer: account,
    audience: alice,
    capabilities: [claim.create({ with: account.did() })],
  })

  const session = await proof.authorize({ issuer: w3 })

  const task = claim.invoke({
    issuer: alice,
    audience: w3,
    with: account.did(),
    proofs: [session],
  })

  const result = await access(await task.delegate(), {
    authority: w3,
    capability: claim,
    principal: Verifier,
  })

  assert.containSubset(result, {
    match: {
      value: {
        can: 'access/claim',
        with: account.did(),
        nb: {},
      },
    },
  })
})

test('delegated ./update', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')
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

  const session = await Delegation.permit({
    issuer: account,
    audience: bob,
    capabilities: [claim.create({ with: account.did() })],
    expiration: Infinity,
  })

  const auth = await session.authorize({
    issuer: worker,
    authority: w3,
    proofs: [authority],
  })

  const request = claim.invoke({
    audience: w3,
    issuer: bob,
    with: account.did(),
    proofs: [auth],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: claim,
    principal: Verifier,
  })

  assert.containSubset(result, {
    match: {
      value: {
        can: 'access/claim',
        with: account.did(),
        nb: {},
      },
    },
  })
})

test('fail without ./update proof', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')

  const inv = claim.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
  })

  const result = await access(await inv.delegate(), {
    authority: w3,
    capability: claim,
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

test('fail invalid ./update proof', async () => {
  const account = alice.withDID('did:mailto:web.mail:alice')
  const agent = bob
  const service = await ed25519.generate()

  const auth = await Delegation.permit({
    issuer: account,
    audience: agent,
    capabilities: [claim.create({ with: account.did() })],
    expiration: Infinity,
  })

  const session = await auth.authorize({
    issuer: service,
    authority: w3,
    proofs: [
      await Core.delegate({
        issuer: w3,
        audience: service,
        capabilities: [
          {
            with: w3.toDIDKey(),
            can: '*',
          },
        ],
      }),
    ],
  })

  const request = claim.invoke({
    audience: w3,
    issuer: agent,
    with: account.did(),
    proofs: [session],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: claim,
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

  const inv = claim.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
  })

  const result = await access(await inv.delegate(), {
    authority: w3,
    capability: claim,
    resolveDIDKey: _ => alice.did(),
    principal: Verifier,
  })

  assert.containSubset(result, {
    match: {
      value: {
        can: 'access/claim',
        with: account.did(),
        nb: {},
      },
    },
  })
})

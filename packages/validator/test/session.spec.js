import { test, assert } from './test.js'
import { access, DID } from '../src/lib.js'
import { capability, URI, Link, Schema } from '../src/lib.js'
import { DIDKeyResolutionError, Failure } from '../src/error.js'
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

const echoKey = capability({
  can: 'debug/echo',
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    message: Schema.string().optional(),
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.containSubset(result, {
    ok: {
      match: {
        value: {
          can: 'debug/echo',
          with: account.did(),
          nb: {
            message: 'hello world',
          },
        },
      },
    },
  })
})

test('validate mailto attested by another service', async () => {
  const agent = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const other = service.withDID('did:web:other.storage')

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const session = await attest.delegate({
    issuer: other,
    audience: agent,
    with: other.did(),
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
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey: did => {
      if (did === other.did()) {
        return Schema.ok([other.toDIDKey()])
      }
      return { error: new DIDKeyResolutionError(did) }
    },
    proofs: [
      await attest.delegate({
        issuer: w3,
        audience: other,
        with: w3.did()
      })
    ],
  })

  assert.containSubset(result, {
    ok: {
      match: {
        value: {
          can: 'debug/echo',
          with: account.did(),
          nb: {
            message: 'hello world',
          },
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.containSubset(result, {
    ok: {
      match: {
        value: {
          can: 'debug/echo',
          with: account.did(),
          nb: {
            message: 'hello world',
          },
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.containSubset(result, {
    error: {
      name: 'Unauthorized',
    },
  })

  assert.match(
    `${result.error}`,
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.containSubset(result, {
    error: {
      name: 'Unauthorized',
    },
  })

  assert.match(
    `${result.error}`,
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.containSubset(result, {
    error: {
      name: 'Unauthorized',
    },
  })

  assert.match(`${result.error}`, /has an invalid session/)
})

test('fail unknown ucan/attest proof', async () => {
  const agent = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const otherService = service.withDID('did:web:other.storage')

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const session = await attest.delegate({
    issuer: otherService,
    audience: agent,
    with: otherService.did(),
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

  // service is w3, but attestation was issued by another service
  const result = await access(await task.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey: did => {
      if (did === otherService.did()) {
        return Schema.ok([otherService.toDIDKey()])
      }
      return { error: new DIDKeyResolutionError(did) }
    }
  })

  assert.containSubset(result, {
    error: {
      name: 'Unauthorized',
    },
  })

  assert.match(
    `${result.error}`,
    /Unable to resolve 'did:mailto:web.mail:alice'/
  )
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
    resolveDIDKey: () => ({ ok: [`did:key:${alice.did().split(':')[2]}`] }),
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.containSubset(result, {
    ok: {
      match: {
        value: {
          can: 'debug/echo',
          with: account.did(),
          nb: {
            message: 'hello world',
          },
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
    issuer: w3,
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.equal(!result.ok, true)
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
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.equal(!result.ok, true)
})

test('service can not delegate account resource', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const proof = await Delegation.delegate({
    issuer: service,
    audience: alice,
    capabilities: [
      {
        can: 'debug/echo',
        with: account.did(),
      },
    ],
  })

  const request = await echo.invoke({
    issuer: alice,
    audience: service,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [proof],
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.equal(!result.ok, true)
})

test('redundant proofs have no impact', async () => {
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const pairs = 6
  const logins = await Promise.all(
    Array(pairs)
      .fill(0)
      .map((_, n) =>
        Delegation.delegate({
          issuer: account,
          audience: alice,
          capabilities: [
            {
              can: '*',
              with: 'ucan:*',
            },
          ],
          expiration: Infinity,
          nonce: `${n}`,
        })
      )
  )

  const expiration = Core.UCAN.now() + 60 * 60 * 24 * 365 // 1 year
  const attestations = await Promise.all(
    logins.map(login =>
      Delegation.delegate({
        issuer: w3,
        audience: alice,
        capabilities: [
          {
            with: w3.did(),
            can: 'ucan/attest',
            nb: { proof: login.cid },
          },
        ],
        expiration,
      })
    )
  )

  const proofs = [...logins, ...attestations]

  const request = await echo.invoke({
    issuer: alice,
    audience: w3,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs,
  })

  const result = await access(await request.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.ok(result.ok)
})

test('fail when no verifiers found', async () => {
  const agent = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const task = echo.invoke({
    issuer: agent,
    audience: w3,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [proof],
    expiration: Infinity,
  })

  const result = await access(await task.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey: () => ({ ok: [] })
  })

  assert.match(
    `${result.error}`,
    /Unable to resolve 'did:mailto:web.mail:alice'/
  )
})

test('succeed with single valid verifier', async () => {
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
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey: () => ({ ok: [alice.toDIDKey()] })
  })

  assert.ok(result.ok)
})

test('succeed with multiple verifiers and one valid', async () => {
  const agent = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const other = await ed25519.generate()

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
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey: () => ({ ok: [`did:key:${other.did().split(':')[2]}`, `did:key:${alice.did().split(':')[2]}`] })
  })

  assert.ok(result.ok)
})

test('fail with multiple invalid verifiers', async () => {
  const agent = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:bob' })
  const other1 = await ed25519.generate()
  const other2 = await ed25519.generate()
  const other3 = await ed25519.generate()

  const proof = await Delegation.delegate({
    issuer: account,
    audience: agent,
    capabilities: [echo.create({ with: account.did(), nb: {} })],
    expiration: Infinity,
  })

  const task = echo.invoke({
    issuer: agent,
    audience: w3,
    with: account.did(),
    nb: { message: 'hello world' },
    proofs: [proof],
    expiration: Infinity,
  })

  const result = await access(await task.delegate(), {
    authority: w3,
    capability: echo,
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey: (did) => {
      if (did === account.did()) {
        // Return verifiers that don't match the account's actual key
        return { ok: [other1.toDIDKey(), other2.toDIDKey()] }
      }
      return { error: new DIDKeyResolutionError(did) }
    }
  })

  console.log('Result:', result)
  console.log('Result error:', result.error)

  assert.match(
    `${result.error}`,
    /Proof .* does not has a valid signature from did:key:/
  )
})
import { test, assert } from './test.js'
import { access, DID } from '../src/validator.js'
import { capability, delegate } from '../src/lib.js'
import { ed25519, Verifier } from '@ucanto/principal'

import { alice, bob, mallory, service } from './fixtures.js'
const w3 = service.withDID('did:web:web3.storage')

const claim = capability({
  can: 'access/claim',
  with: DID.match({ method: 'mailto' }),
})

const update = capability({
  can: './update',
  with: DID,
  nb: {
    key: DID.match({ method: 'key' }),
  },
})

test('validate mailto', async () => {
  const account = alice.withDID('did:mailto:alice@web.mail')

  const auth = await update.delegate({
    issuer: w3,
    audience: account,
    with: w3.did(),
    nb: { key: alice.did() },
    expiration: Infinity,
  })

  const inv = claim.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
    expiration: Infinity,
    proofs: [auth],
  })

  const result = await access(await inv.delegate(), {
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
  const account = alice.withDID('did:mailto:alice@web.mail')
  const manager = await ed25519.generate()
  const worker = await ed25519.generate()

  const authority = await delegate({
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
      await delegate({
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

  const auth = await update.delegate({
    issuer: worker,
    audience: account,
    with: w3.did(),
    nb: { key: alice.did() },
    proofs: [authority],
  })

  const request = claim.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
    expiration: Infinity,
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
  const account = alice.withDID('did:mailto:alice@web.mail')

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
    /Unable to resolve 'did:mailto:alice@web.mail'/
  )
})

test('fail invalid ./update proof', async () => {
  const account = alice.withDID('did:mailto:alice@web.mail')
  const service = await ed25519.generate()

  const auth = await update.delegate({
    issuer: service,
    audience: account,
    with: w3.did(),
    nb: { key: alice.did() },
    proofs: [
      await delegate({
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
    issuer: account,
    with: account.did(),
    expiration: Infinity,
    proofs: [auth],
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

  assert.match(
    result.toString(),
    /did:web:web3.storage can not be derived from did:key/
  )
})

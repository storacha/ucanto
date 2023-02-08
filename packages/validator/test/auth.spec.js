import { test, assert } from './test.js'
import { access, DID } from '../src/lib.js'
import { capability, URI, Link, Schema } from '../src/lib.js'
import { Failure } from '../src/error.js'
import { ed25519, Verifier } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import * as Core from '@ucanto/core'

import { alice, bob, mallory, service } from './fixtures.js'
const w3 = service.withDID('did:web:web3.storage')

// const access = Schema.struct({
//   can: Schema.string(),
//   with: Schema.string(),
// })

// const update = capability({
//   can: './update',
//   with: DID,
//   nb: {
//     aud: DID.match({ method: 'key' }),
//     att: access.array(),
//     exp: Schema.integer().optional(),
//     nbf: Schema.integer().optional(),
//   },
// })

const any = capability({
  can: '*',
  with: DID,
})

const capabilities = {
  dev: {
    ping: any.derive({
      to: capability({
        can: 'dev/ping',
        with: DID,
        nb: {
          message: Schema.string(),
        },
      }),
      derives: (claim, proof) => {
        return (
          claim.with.startsWith(proof.with) || new Failure('Can not derive')
        )
      },
    }),
  },
}

test('check validation', async () => {
  const proof = await Core.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        with: 'did:',
        can: '*',
      },
    ],
  })

  const ping = capabilities.dev.ping.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'hello',
    },
    proofs: [proof],
  })

  const result = await access(await ping.delegate(), {
    authority: w3,
    capability: capabilities.dev.ping,
    principal: Verifier,
  })

  console.log(result)

  assert.equal(result.error, undefined)
})

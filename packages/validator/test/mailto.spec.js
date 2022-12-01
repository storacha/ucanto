import { test, assert } from './test.js'
import { access, DID } from '../src/lib.js'
import { capability, URI, Link } from '../src/lib.js'
import { Failure } from '../src/error.js'
import { ed25519, Verifier } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import * as Core from '@ucanto/core'

import { alice, bob, mallory, service as w3 } from './fixtures.js'

const claim = capability({
  can: 'access/claim',
  with: DID.match({ method: 'mailto' }),
})

const sign = capability({
  can: 'ucan/sign',
  with: DID.match({ method: 'key' }),
})

test.only('validate mailto', async () => {
  const account = alice.withDID('did:mailto:alice@web.mail')

  const proof = await sign.delegate({
    issuer: w3,
    audience: account,
    with: w3.did(),
    expiration: Infinity,
  })

  const inv = claim.invoke({
    audience: w3,
    issuer: account,
    with: account.did(),
    expiration: Infinity,
    proofs: [proof],
  })

  const result = await access(await inv.delegate(), {
    capability: claim.or(sign),
    principal: Verifier,
  })

  console.log(result)
})

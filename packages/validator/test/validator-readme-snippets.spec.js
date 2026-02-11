import { test, assert } from './test.js'
import { access, DID, capability, fail, Link, Schema } from '../src/lib.js'
import { Verifier, ed25519 } from '@ucanto/principal'

test('README validator example works', async () => {
  const alice = await ed25519.generate()
  const bob = await ed25519.generate()

  const storeAdd = capability({
    can: 'store/add',
    with: DID,
    nb: Schema.struct({
      link: Link,
      size: Schema.integer().optional(),
    }),
    derives: (claim, proof) => {
      if (claim.with !== proof.with) {
        return fail('with field does not match')
      }
      return { ok: {} }
    },
  })

  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },
  })

  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: alice,
    with: alice.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },
    proofs: [proof],
  })

  const result = await access(await invocation.delegate(), {
    authority: alice,
    capability: storeAdd,
    principal: Verifier,
    validateAuthorization: () => ({ ok: {} }),
  })

  assert.ok(!result.error, `Expected no error, got: ${result.error?.message}`)
})

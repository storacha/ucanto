import { test, assert } from './test.js'
import { access } from '../src/lib.js'
import { capability, URI, Link } from '../src/lib.js'
import { Failure } from '../src/error.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'

import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { UCAN, DID as Principal } from '@ucanto/core'
import { UnavailableProof } from '../src/error.js'

const storeAdd = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    link: Link,
    origin: Link.optional(),
  },
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return new Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return new Failure(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return true
    }
  },
})

test('authorize self-issued invocation', async () => {
  const invocation = await storeAdd.invoke({
    issuer: alice,
    audience: bob,
    nb: {
      link: Link.parse('bafkqaaa'),
    },
    with: alice.did(),
  })

  const result = await access(await invocation.delegate(), {
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: {},
    },
    issuer: Principal.from(alice.did()),
    audience: Principal.parse(bob.did()),
    proofs: [],
  })
})

test('unauthorized / expired invocation', async () => {
  const expiration = UCAN.now() - 5
  const invocation = storeAdd.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },
    expiration,
  })

  const result = await access(await invocation.delegate(), {
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    message: `Expired on ${new Date(expiration * 1000)}`,
    cause: {
      name: 'Expired',
      expiredAt: expiration,
      message: `Expired on ${new Date(expiration * 1000)}`,
    },
  })

  assert.deepEqual(
    JSON.stringify(result),
    JSON.stringify({
      error: true,
      name: 'Unauthorized',
      message: `Expired on ${new Date(expiration * 1000)}`,
      cause: {
        error: true,
        name: 'Expired',
        message: `Expired on ${new Date(expiration * 1000)}`,
        expiredAt: expiration,
        stack: result.error ? result.cause.stack : undefined,
      },
      stack: result.error ? result.stack : undefined,
    })
  )
})

test('unauthorized / not vaid before invocation', async () => {
  const notBefore = UCAN.now() + 500
  const invocation = await storeAdd.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    notBefore,
  })

  const result = await access(await invocation.delegate(), {
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    cause: {
      name: 'NotValidBefore',
      validAt: notBefore,
      message: `Not valid before ${new Date(notBefore * 1000)}`,
    },
  })
})

test.skip('unauthorized / invalid signature', async () => {
  const invocation = await storeAdd.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
  })

  const delegation = await invocation.delegate()

  delegation.data.signature.set(await bob.sign(delegation.bytes))

  const result = await access(delegation, {
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    cause: {
      name: 'InvalidSignature',
      message: `Signature is invalid`,
      issuer: invocation.issuer,
      audience: invocation.audience,
    },
  })
})

test('unauthorized / unknown capability', async () => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/write',
        with: alice.did(),
      },
    ],
    proofs: [],
  })

  const result = await access(invocation, {
    // @ts-ignore
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    error: true,
    cause: {
      name: 'UnknownCapability',
      message: `Encountered unknown capability: {"can":"store/write","with":"${alice.did()}"}`,
    },
  })
})

test('authorize / delegated invocation', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: {},
    },
    issuer: Principal.parse(bob.did()),
    audience: Principal.parse(w3.did()),
    proofs: [
      {
        capability: {
          can: 'store/add',
          with: alice.did(),
          nb: {},
        },
        issuer: Principal.parse(alice.did()),
        audience: Principal.parse(bob.did()),
        proofs: [],
      },
    ],
  })
})

test('authorize / delegation chain', async () => {
  const aliceToBob = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const bobToMallory = await storeAdd.delegate({
    issuer: bob,
    audience: mallory,
    with: alice.did(),
    proofs: [aliceToBob],
  })

  const invocation = storeAdd.invoke({
    issuer: mallory,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [bobToMallory],
  })

  const result = await access(await invocation.delegate(), {
    capability: storeAdd,
    principal: ed25519.Verifier,
  })

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: {},
    },
    issuer: Principal.parse(mallory.did()),
    audience: Principal.parse(w3.did()),
    proofs: [
      {
        capability: {
          can: 'store/add',
          with: alice.did(),
          nb: {},
        },
        issuer: Principal.parse(bob.did()),
        audience: Principal.parse(mallory.did()),
        proofs: [
          {
            capability: {
              can: 'store/add',
              with: alice.did(),
              nb: {},
            },
            issuer: Principal.parse(alice.did()),
            audience: Principal.parse(bob.did()),
            proofs: [],
          },
        ],
      },
    ],
  })
})

test('invalid claim / no proofs', async () => {
  const invocation = storeAdd.invoke({
    issuer: alice,
    audience: bob,
    nb: { link: Link.parse('bafkqaaa') },
    with: bob.did(),
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${bob.did()}"} is invalid
  - Capability can not be (self) issued by '${alice.did()}'
  - Delegated capability not found`,
      capability: {
        can: 'store/add',
        with: bob.did(),
        nb: {},
      },
    },
  })
})

test('invalid claim / expired', async () => {
  const expiration = UCAN.now() - 5
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    expiration,
    with: alice.did(),
  })

  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive from prf:0 - ${delegation.cid} because:
    - Expired on ${new Date(expiration * 1000)}`,
      capability: {
        can: 'store/add',
        with: alice.did(),
        nb: {},
      },
      delegation: invocation,
    },
  })
})

test('invalid claim / not valid before', async () => {
  const notBefore = UCAN.now() + 60 * 60
  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    notBefore,
    with: alice.did(),
  })

  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [proof],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive from prf:0 - ${proof.cid} because:
    - Not valid before ${new Date(notBefore * 1000)}`,
      capability: {
        can: 'store/add',
        with: alice.did(),
        nb: {},
      },
      delegation: invocation,
    },
  })
})

test('invalid claim / invalid signature', async () => {
  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })
  // Just messing up signature
  proof.data.signature.set(await bob.sign(proof.data.signature))

  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [proof],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive from prf:0 - ${proof.cid} because:
    - Signature is invalid`,
      capability: {
        can: 'store/add',
        with: alice.did(),
        nb: {},
      },
      delegation: invocation,
    },
  })
})

test('invalid claim / unknown capability', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Delegated capability not found
  - Encountered unknown capabilities
    - {"can":"store/pin","with":"${alice.did()}"}`,
    },
  })
})

test('invalid claim / malformed capability', async () => {
  const badDID = `bib:${alice.did().slice(4)}`
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: /** @type {UCAN.Resource}*/ (badDID),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
        nb: { link: Link.parse('bafkqaaa') },
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive {"can":"store/add","with":"${alice.did()}"} from delegated capabilities:
    - Encountered malformed 'store/add' capability: {"can":"store/add","with":"${badDID}"}
      - Expected did: URI instead got ${badDID}`,
    },
  })
})

test('invalid claim / unavailable proof', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [delegation.cid],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive from prf:0 - ${delegation.cid} because:
    - Linked proof '${delegation.cid}' is not included nor could be resolved`,
    },
  })
})

test('invalid claim / failed to resolve', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [delegation.cid],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    resolve() {
      throw new Error('Boom!')
    },
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive from prf:0 - ${delegation.cid} because:
    - Linked proof '${delegation.cid}' is not included nor could be resolved
      - Provided resolve failed: Boom!`,
    },
  })
})

test('invalid claim / invalid audience', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const invocation = await storeAdd.invoke({
    issuer: mallory,
    audience: w3,
    with: alice.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${mallory.did()}'
  - Can not derive from prf:0 - ${delegation.cid} because:
    - Delegates to '${bob.did()}' instead of '${mallory.did()}'`,
    },
  })
})

test('invalid claim / invalid claim', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: mallory.did(),
  })

  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${alice.did()}"} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - Can not derive {"can":"store/add","with":"${alice.did()}"} from delegated capabilities:
    - Constraint violation: Expected 'with: "${mallory.did()}"' instead got '${alice.did()}'`,
    },
  })
})

test('invalid claim / invalid sub delegation', async () => {
  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: w3.did(),
  })

  const delegation = await storeAdd.delegate({
    issuer: bob,
    audience: mallory,
    with: w3.did(),
    proofs: [proof],
  })

  const invocation = storeAdd.invoke({
    issuer: mallory,
    audience: w3,
    with: w3.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    cause: {
      name: 'InvalidClaim',
      message: `Claimed capability {"can":"store/add","with":"${w3.did()}"} is invalid
  - Capability can not be (self) issued by '${mallory.did()}'
  - Claimed capability {"can":"store/add","with":"${w3.did()}"} is invalid
    - Capability can not be (self) issued by '${bob.did()}'
    - Claimed capability {"can":"store/add","with":"${w3.did()}"} is invalid
      - Capability can not be (self) issued by '${alice.did()}'
      - Delegated capability not found`,
    },
  })
})

test('authorize / resolve external proof', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: {
      link: Link.parse('bafkqaaa'),
    },

    proofs: [delegation.cid],
  })

  const result = await access(await invocation.delegate(), {
    principal: ed25519.Verifier,
    resolve: async link => {
      if (link.toString() === delegation.cid.toString()) {
        return delegation
      } else {
        return new UnavailableProof(link)
      }
    },
    capability: storeAdd,
  })

  if (result.error) {
    assert.fail(result.message)
  }

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
      nb: {},
    },
    proofs: [
      {
        delegation,
        issuer: Principal.parse(alice.did()),
        audience: Principal.parse(bob.did()),
        capability: {
          can: 'store/add',
          with: alice.did(),
        },
        proofs: [],
      },
    ],
  })
})

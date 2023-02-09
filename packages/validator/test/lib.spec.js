import { test, assert } from './test.js'
import { access, claim, Schema } from '../src/lib.js'
import { capability, URI, Link } from '../src/lib.js'
import { Failure } from '../src/error.js'
import { Verifier } from '@ucanto/principal'
import * as Client from '@ucanto/client'

import { alice, bob, mallory, service, service as w3 } from './fixtures.js'
import { UCAN, DID as Principal } from '@ucanto/core'
import { UnavailableProof } from '../src/error.js'

const storeAdd = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    link: Link,
    origin: Link.optional(),
  }),
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
    authority: w3,
    capability: storeAdd,
    principal: Verifier,
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
  const invocation = await storeAdd
    .invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {
        link: Link.parse('bafkqaaa'),
      },
      expiration,
    })
    .delegate()

  const result = await access(invocation, {
    authority: w3,
    capability: storeAdd,
    principal: Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Proof ${invocation.cid} has expired on ${new Date(expiration * 1000)}`,
  })

  assert.deepEqual(
    JSON.stringify(result),
    JSON.stringify({
      error: true,
      name: 'Unauthorized',
      message: `Claim ${storeAdd} is not authorized
  - Proof ${invocation.cid} has expired on ${new Date(expiration * 1000)}`,
      stack: result.error ? result.stack : undefined,
    })
  )
})

test('unauthorized / not valid before invocation', async () => {
  const notBefore = UCAN.now() + 500
  const invocation = await storeAdd
    .invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: { link: Link.parse('bafkqaaa') },
      notBefore,
    })
    .delegate()

  const result = await access(invocation, {
    authority: w3,
    capability: storeAdd,
    principal: Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Proof ${invocation.cid} is not valid before ${new Date(notBefore * 1000)}`,
  })
})

test('unauthorized / invalid signature', async () => {
  const invocation = await storeAdd
    .invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: { link: Link.parse('bafkqaaa') },
    })
    .delegate()

  invocation.data.signature.set(await bob.sign(invocation.bytes))

  const result = await access(invocation, {
    authority: w3,
    capability: storeAdd,
    principal: Verifier,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Proof ${invocation.cid} does not has a valid signature from ${alice.did()}`,
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
    authority: w3,
    // @ts-ignore
    capability: storeAdd,
    principal: Verifier,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    error: true,
    message: `Claim ${storeAdd} is not authorized
  - No matching delegated capability found
  - Encountered unknown capabilities
    - {"can":"store/write","with":"${alice.did()}"}`,
  })
})

test('authorize / delegated invocation', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  delegation.capabilities[0].nb

  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link: Link.parse('bafkqaaa') },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    capability: storeAdd,
    principal: Verifier,
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
    authority: w3,
    capability: storeAdd,
    principal: Verifier,
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
  const link = Link.parse('bafkqaaa')
  const invocation = storeAdd.invoke({
    issuer: alice,
    audience: bob,
    nb: { link },
    with: bob.did(),
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${bob.did()}","nb":${JSON.stringify({
      link,
    })}} is not authorized because:
    - Capability can not be (self) issued by '${alice.did()}'
    - Delegated capability not found`,
  })
})

test('invalid claim / expired', async () => {
  const expiration = UCAN.now() - 5
  const link = Link.parse('bafkqaaa')
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    expiration,
    with: alice.did(),
  })

  const invocation = await storeAdd
    .invoke({
      issuer: bob,
      audience: w3,
      with: alice.did(),
      nb: { link },
      proofs: [delegation],
    })
    .delegate()

  const result = await access(invocation, {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      { link }
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Capability can not be derived from prf:0 - ${delegation.cid} because:
      - Proof ${delegation.cid} has expired on ${new Date(expiration * 1000)}`,
  })
})

test('invalid claim / not valid before', async () => {
  const notBefore = UCAN.now() + 60 * 60
  const link = Link.parse('bafkqaaa')
  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    notBefore,
    with: alice.did(),
  })

  const invocation = await storeAdd
    .invoke({
      issuer: bob,
      audience: w3,
      with: alice.did(),
      nb: { link },
      proofs: [proof],
    })
    .delegate()

  const result = await access(invocation, {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      { link }
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Capability can not be derived from prf:0 - ${proof.cid} because:
      - Proof ${proof.cid} is not valid before ${new Date(notBefore * 1000)}`,
  })
})

test('invalid claim / invalid signature', async () => {
  const link = Link.parse('bafkqaaa')
  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })
  // Just messing up signature
  proof.data.signature.set(await bob.sign(proof.data.signature))

  const invocation = await storeAdd
    .invoke({
      issuer: bob,
      audience: w3,
      with: alice.did(),
      nb: { link },
      proofs: [proof],
    })
    .delegate()

  const result = await access(invocation, {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      { link }
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Capability can not be derived from prf:0 - ${proof.cid} because:
      - Proof ${proof.cid} does not has a valid signature from ${alice.did()}`,
  })
})

test('invalid claim / unknown capability', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/pin',
        with: alice.did(),
      },
    ],
  })

  const link = Link.parse('bafkqaaa')
  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb: { link },
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      { link }
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Delegated capability not found
    - Encountered unknown capabilities
      - {"can":"store/pin","with":"${alice.did()}"}`,
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

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = await Client.delegate({
    issuer: bob,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
        nb,
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Can not derive {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} from delegated capabilities:
      - Encountered malformed 'store/add' capability: {"can":"store/add","with":"${badDID}"}
        - Expected did: URI instead got ${badDID}`,
  })
})

test('invalid claim / unavailable proof', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb,
    proofs: [delegation.cid],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Capability can not be derived from prf:0 - ${delegation.cid} because:
      - Linked proof '${
        delegation.cid
      }' is not included and could not be resolved`,
  })
})

test('invalid claim / failed to resolve', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb,
    proofs: [delegation.cid],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    resolve() {
      throw new Error('Boom!')
    },
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Capability can not be derived from prf:0 - ${delegation.cid} because:
      - Linked proof '${
        delegation.cid
      }' is not included and could not be resolved
        - Proof resolution failed with: Boom!`,
  })
})

test('invalid claim / invalid audience', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = await storeAdd.invoke({
    issuer: mallory,
    audience: w3,
    with: alice.did(),
    nb,
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${mallory.did()}'
    - Capability can not be derived from prf:0 - ${delegation.cid} because:
      - Delegation audience is '${bob.did()}' instead of '${mallory.did()}'`,
  })
})

test('invalid claim / invalid claim', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: mallory.did(),
  })

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = await storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: alice.did(),
    nb,
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Can not derive {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} from delegated capabilities:
      - Constraint violation: Expected 'with: "${mallory.did()}"' instead got '${alice.did()}'`,
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

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = storeAdd.invoke({
    issuer: mallory,
    audience: w3,
    with: w3.did(),
    nb,
    proofs: [delegation],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  const capability = `{"can":"store/add","with":"${w3.did()}","nb":${JSON.stringify(
    nb
  )}}`

  assert.containSubset(result, {
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Capability ${capability} is not authorized because:
    - Capability can not be (self) issued by '${mallory.did()}'
    - Capability ${capability} is not authorized because:
      - Capability can not be (self) issued by '${bob.did()}'
      - Capability ${capability} is not authorized because:
        - Capability can not be (self) issued by '${alice.did()}'
        - Delegated capability not found`,
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
    authority: w3,
    principal: Verifier,
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
    assert.fail(result.stack)
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

test('invalid claim / principal alignment', async () => {
  const proof = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = storeAdd.invoke({
    issuer: mallory,
    audience: w3,
    with: alice.did(),
    nb,
    proofs: [proof],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${alice.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${mallory.did()}'
    - Capability can not be derived from prf:0 - ${proof.cid} because:
      - Delegation audience is '${bob.did()}' instead of '${mallory.did()}'`,
  })
})

test('invalid claim / invalid delegation chain', async () => {
  const space = alice

  const proof = await storeAdd.delegate({
    issuer: space,
    audience: w3,
    with: space.did(),
  })

  const nb = { link: Link.parse('bafkqaaa') }
  const invocation = storeAdd.invoke({
    issuer: bob,
    audience: w3,
    with: space.did(),
    nb,
    proofs: [proof],
  })

  const result = await access(await invocation.delegate(), {
    authority: w3,
    principal: Verifier,
    capability: storeAdd,
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    message: `Claim ${storeAdd} is not authorized
  - Capability {"can":"store/add","with":"${space.did()}","nb":${JSON.stringify(
      nb
    )}} is not authorized because:
    - Capability can not be (self) issued by '${bob.did()}'
    - Capability can not be derived from prf:0 - ${proof.cid} because:
      - Delegation audience is '${w3.did()}' instead of '${bob.did()}'`,
  })
})

test('claim without a proof', async () => {
  const delegation = await storeAdd.delegate({
    issuer: alice,
    audience: bob,
    with: alice.did(),
  })

  const result = await claim(storeAdd, [delegation.cid], {
    authority: w3,
    principal: Verifier,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Linked proof '${delegation.cid}' is not included and could not be resolved`,
  })
})

test('mismatched signature', async () => {
  const old = alice.withDID('did:web:w3.storage')
  const current = bob.withDID('did:web:w3.storage')

  const delegation = await storeAdd.delegate({
    issuer: old,
    audience: old,
    with: old.did(),
  })

  const result = await claim(storeAdd, [delegation], {
    authority: current,
    principal: Verifier,
  })

  assert.containSubset(result, {
    name: 'Unauthorized',

    message: `Claim ${storeAdd} is not authorized
  - Proof ${
    delegation.cid
  } issued by ${current.did()} does not has a valid signature from ${current.toDIDKey()}
    ℹ️ Probably issuer signed with a different key, which got rotated, invalidating delegations that were issued with prior keys`,
  })
})

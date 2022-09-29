import { test, assert } from './test.js'
import { access } from '../src/lib.js'
import { capability, URI, Link, DID } from '../src/lib.js'
import { Failure } from '../src/error.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'

import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { UCAN, DID as Principal } from '@ucanto/core'
import { UnavailableProof } from '../src/error.js'
import { equalWith, canDelegateURI, fail } from './util.js'
import * as API from './types.js'

const storeAdd = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    link: Link.optional(),
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
test('self-issued invocation', async () => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const result = await access(invocation, {
    capability: storeAdd,
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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

test('expired invocation', async () => {
  const expiration = UCAN.now() - 5
  const invocation = await Client.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    expiration,
  })

  const result = await access(invocation, {
    capability: storeAdd,
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
      },
    })
  )
})

test('not vaid before invocation', async () => {
  const notBefore = UCAN.now() + 500
  const invocation = await Client.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    notBefore,
  })

  const result = await access(invocation, {
    capability: storeAdd,
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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

test('invalid signature', async () => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  invocation.data.signature.set(await bob.sign(invocation.bytes))

  const result = await access(invocation, {
    capability: storeAdd,
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
  })

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    cause: {
      name: 'InvalidSignature',
      message: `Signature is invalid`,
    },
  })
})

test('unknown capability', async () => {
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
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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

test('delegated invocation', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
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
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    capability: storeAdd,
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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

test('invalid claim / no proofs', async () => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: bob.did(),
      },
    ],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    expiration,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: w3,
    capabilities: delegation.capabilities,
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
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
  const proof = await Client.delegate({
    issuer: alice,
    audience: bob,
    notBefore,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: w3,
    capabilities: proof.capabilities,
    proofs: [proof],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
  const proof = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })
  // Just messing up signature
  proof.data.signature.set(await bob.sign(proof.data.signature))

  const invocation = await Client.delegate({
    issuer: bob,
    audience: w3,
    capabilities: proof.capabilities,
    proofs: [proof],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
    capabilities: [
      {
        can: 'store/pin',
        with: alice.did(),
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
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
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
      },
    ],
    proofs: [delegation.cid],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
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
    - Linked proof '${delegation.cid}' is not included nor could be resolved`,
    },
  })
})

test('invalid claim / failed to resolve', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
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
      },
    ],
    proofs: [delegation.cid],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: mallory,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: mallory.did(),
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
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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
  const proof = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: w3.did(),
      },
    ],
  })

  const delegation = await Client.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'store/add',
        with: w3.did(),
      },
    ],
    proofs: [proof],
  })

  const invocation = await Client.delegate({
    issuer: mallory,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: w3.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
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

test('delegate with my:*', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: '*',
        with: 'my:*',
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
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    my: issuer => {
      return [
        {
          can: 'store/add',
          with: issuer,
        },
      ]
    },
    capability: storeAdd,
  })

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    issuer: Principal.parse(bob.did()),
    audience: Principal.parse(w3.did()),
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

test('delegate with my:did', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: '*',
        with: 'my:did',
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
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    my: issuer => {
      return [
        {
          can: 'store/add',
          with: issuer,
        },
      ]
    },
    capability: storeAdd,
  })

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    issuer: Principal.parse(bob.did()),
    audience: Principal.parse(w3.did()),
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

test('delegate with as:*', async () => {
  const my = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: '*',
        with: 'my:*',
      },
    ],
  })

  const as = await Client.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: '*',
        with: /** @type {API.UCAN.Resource} */ (`as:${alice.did()}:*`),
      },
    ],
    proofs: [my],
  })

  const invocation = await Client.delegate({
    issuer: mallory,
    audience: w3,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ],
    proofs: [as],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    my: issuer => {
      return [
        {
          can: 'store/add',
          with: issuer,
        },
      ]
    },
    capability: storeAdd,
  })

  assert.containSubset(result, {
    capability: {
      can: 'store/add',
      with: alice.did(),
    },
    proofs: [
      {
        delegation: as,
        issuer: Principal.parse(bob.did()),
        audience: Principal.parse(mallory.did()),
        capability: {
          can: 'store/add',
          with: alice.did(),
        },
        proofs: [
          {
            delegation: my,
            issuer: Principal.parse(alice.did()),
            audience: Principal.parse(bob.did()),
            capability: {
              can: 'store/add',
              with: alice.did(),
            },
          },
        ],
      },
    ],
  })
})

test('delegate with as:did', async () => {
  const mailto = capability({
    can: 'msg/send',
    with: URI.match({ protocol: 'mailto:' }),
  })

  const my = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: '*',
        with: 'my:*',
      },
    ],
  })

  const as = await Client.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        can: 'msg/send',
        with: /** @type {API.UCAN.Resource} */ (`as:${alice.did()}:mailto`),
      },
    ],
    proofs: [my],
  })

  const invocation = await Client.delegate({
    issuer: mallory,
    audience: w3,
    capabilities: [
      {
        can: 'msg/send',
        with: 'mailto:alice@web.mail',
      },
    ],
    proofs: [as],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return (
        claim.with === issuer ||
        (issuer === alice.did() && claim.can === 'msg/send')
      )
    },
    my: issuer => {
      return [
        {
          can: 'msg/send',
          with: 'mailto:alice@web.mail',
        },
      ]
    },
    capability: mailto,
  })

  assert.containSubset(result, {
    capability: {
      can: 'msg/send',
      with: 'mailto:alice@web.mail',
    },
    proofs: [
      {
        delegation: as,
        issuer: Principal.parse(bob.did()),
        audience: Principal.parse(mallory.did()),
        capability: {
          can: 'msg/send',
          with: 'mailto:alice@web.mail',
        },
        proofs: [
          {
            delegation: my,
            issuer: Principal.parse(alice.did()),
            audience: Principal.parse(bob.did()),
            capability: {
              can: 'msg/send',
              with: 'mailto:alice@web.mail',
            },
          },
        ],
      },
    ],
  })
})

test('resolve proof', async () => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'store/add',
        with: alice.did(),
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
      },
    ],
    proofs: [delegation.cid],
  })

  const result = await access(invocation, {
    principal: ed25519.Verifier,
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    resolve: async link => {
      if (link.toString() === delegation.cid.toString()) {
        return delegation
      } else {
        return new UnavailableProof(link)
      }
    },
    capability: storeAdd,
  })

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

test('execute capabilty', async () => {
  const Voucher = capability({
    can: 'voucher/*',
    with: DID.match({ method: 'key' }),
  })

  const Claim = Voucher.derive({
    to: capability({
      can: 'voucher/claim',
      with: DID.match({ method: 'key' }),
      nb: {
        product: Link,
        identity: URI.match({ protocol: 'mailto:' }),
        service: DID,
      },
      derives: (child, parent) => {
        return (
          fail(equalWith(child, parent)) ||
          fail(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
          fail(
            canDelegateURI(
              child.nb.product.toString(),
              parent.nb.product.toString()
            )
          ) ||
          fail(canDelegateURI(child.nb.service, parent.nb.service)) ||
          true
        )
      },
    }),
    derives: equalWith,
  })

  const claim = Claim.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      identity: URI.from(`mailto:${alice.did}@web.mail`),
      product: Link.parse('bafkqaaa'),
      service: w3.did(),
    },
  })

  /**
   * @param {API.ConnectionView<API.Service>} connection
   */

  const demo = async connection => {
    const result = await claim.execute(connection)
  }
})

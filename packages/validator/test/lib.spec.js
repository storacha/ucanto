import test from "ava"
import { access } from "../src/lib.js"
import * as Client from "@ucanto/client"
import * as API from "@ucanto/interface"
import * as StoreAdd from "./capability/store/add.js"
import { alice, bob, mallory, service } from "./fixtures.js"
import * as UCAN from "@ipld/dag-ucan"
import { UnavailableProof } from "../src/error.js"

test("self-issued invocation", async assert => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    proof: {
      issuer: alice.authority,
      audience: alice.authority,
      delegation: invocation,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
          link: null,
        },
      ],
      proofs: [],
    },
  })
})

test("delegated invocation", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    proof: {
      issuer: alice.authority,
      audience: bob.authority,
      delegation,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
          link: null,
        },
      ],
      proofs: {
        ...[
          {
            issuer: alice.authority,
            audience: alice.authority,
            delegation,
            capabilities: [
              {
                can: "store/add",
                with: alice.did(),
                link: null,
              },
            ],
          },
        ],
      },
    },
  })
})

test("invalid claim / no proofs", async assert => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: bob.did(),
      },
    ],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${bob.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${alice.did()}'
  - There are no delegated proofs`,
    capability: {
      can: "store/add",
      with: bob.did(),
      link: null,
    },
    delegation: invocation,
    proofs: [],
  })
})

test("invalid claim / expired", async assert => {
  const expiration = UCAN.now() - 5
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    expiration,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: delegation.capabilities,
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - prf:0 Expired on ${new Date(expiration * 1000)}`,
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    delegation: invocation,
    proofs: {
      ...[
        {
          name: "Expired",
          delegation,
          expiredAt: expiration,
        },
      ],
    },
  })
})

test("invalid claim / not valid before", async assert => {
  const notBefore = UCAN.now() + 60 * 60
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    notBefore,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: delegation.capabilities,
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - prf:0 Not valid before ${new Date(notBefore * 1000)}`,
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    delegation: invocation,
    proofs: {
      ...[
        {
          name: "NotValidBefore",
          delegation,
          validAt: notBefore,
        },
      ],
    },
  })
})

test("invalid claim / invalid signature", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })
  // Just messing up signature
  delegation.data.signature.set(await alice.sign(delegation.data.signature))

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: delegation.capabilities,
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - prf:0 Signature is invalid`,
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    delegation: invocation,
    proofs: {
      ...[
        {
          name: "InvalidSignature",
          issuer: alice.authority,
          audience: bob.authority,
          delegation,
        },
      ],
    },
  })
})

test("invalid claim / unknown capability", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/pin",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - prf:0 Does not delegate matching capability {"can":"store/add","with":"${alice.did()}","link":null}
    - Encountered unkown capability: {"can":"store/pin","with":"${alice.did()}"}`,
  })
})

test("invalid claim / malformed capability", async assert => {
  const badDID = `bib:${alice.did().slice(4)}`
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: /** @type {UCAN.Resource}*/ (badDID),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - prf:0 Does not delegate matching capability {"can":"store/add","with":"${alice.did()}","link":null}
    - Encountered malformed capability: {"can":"store/add","with":"${badDID}"}
      - Expected 'with' to be 'did:' URI instead got, '${badDID}'`,
  })
})

test("invalid claim / unavailable proof", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation.cid],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${bob.did()}'
  - prf:0 Linked proof '${
    delegation.cid
  }' is not included nor available locally`,
  })
})

test("invalid claim / invalid audience", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: mallory,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    ...StoreAdd,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${alice.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${mallory.did()}'
  - prf:0 Delegates to '${bob.did()}' instead of '${mallory.did()}'`,
  })
})

test("delegate my:*", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "*",
        with: "my:*",
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    my: issuer => {
      return [
        {
          can: "store/add",
          with: issuer,
        },
      ]
    },
    ...StoreAdd,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    proof: {
      delegation,
      issuer: alice.authority,
      audience: bob.authority,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
          link: null,
        },
      ],
      proofs: {
        ...[
          {
            delegation,
            issuer: alice.authority,
            audience: alice.authority,
            capabilities: [
              {
                can: "store/add",
                with: alice.did(),
                link: null,
              },
            ],
          },
        ],
      },
    },
  })
})

test("as:*", async assert => {
  const my = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "*",
        with: "my:*",
      },
    ],
  })

  const as = await Client.delegate({
    issuer: bob,
    audience: mallory.authority,
    capabilities: [
      {
        can: "*",
        with: /** @type {API.UCAN.Resource} */ (`as:${alice.did()}:*`),
      },
    ],
    proofs: [my],
  })

  const invocation = await Client.delegate({
    issuer: mallory,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [as],
  })

  const result = await access(invocation, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    my: issuer => {
      return [
        {
          can: "store/add",
          with: issuer,
        },
      ]
    },
    ...StoreAdd,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    proof: {
      delegation: as,
      issuer: bob.authority,
      audience: mallory.authority,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
          link: null,
        },
      ],
      proofs: {
        ...[
          {
            delegation: my,
            issuer: alice.authority,
            audience: bob.authority,
            capabilities: [
              {
                can: "store/add",
                with: alice.did(),
                link: null,
              },
            ],
          },
        ],
      },
    },
  })
})

test("resolve proof", async assert => {
  const delegation = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [delegation.cid],
  })

  const result = await access(invocation, {
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
    ...StoreAdd,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
    proof: {
      delegation,
      issuer: alice.authority,
      audience: bob.authority,
      capabilities: [
        {
          can: "store/add",
          with: alice.did(),
          link: null,
        },
      ],
      proofs: {
        ...[
          {
            delegation,
            issuer: alice.authority,
            audience: alice.authority,
            capabilities: [
              {
                can: "store/add",
                with: alice.did(),
                link: null,
              },
            ],
          },
        ],
      },
    },
  })
})

import test from "ava"
import { access } from "../src/lib.js"
import * as Client from "@ucanto/client"
import * as API from "@ucanto/interface"
import * as StoreAdd from "./capability/store/add.js"
import { alice, bob, mallory, service } from "./fixtures.js"
import { assert } from "chai"

test("self-issued", async assert => {
  const token = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const result = await access(token, {
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

test("delegated", async assert => {
  const proof = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
  })

  const token = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [proof],
  })

  const result = await access(token, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    parse: StoreAdd.parse,
    check: StoreAdd.check,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
  })
})

test("invalid", async assert => {
  const token = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "store/add",
        with: bob.did(),
      },
    ],
  })

  const result = await access(token, {
    canIssue: (claim, issuer) => {
      return claim.with === issuer
    },
    parse: StoreAdd.parse,
    check: StoreAdd.check,
  })

  assert.like(result, {
    name: "InvalidClaim",
    message: `Claimed capability {"can":"store/add","with":"${bob.did()}","link":null} is invalid
  - Capability can not be (self) issued by '${alice.did()}'
  - There are no delegated proofs`,
  })
})

test("my:*", async assert => {
  const proof = await Client.delegate({
    issuer: alice,
    audience: bob.authority,
    capabilities: [
      {
        can: "*",
        with: "my:*",
      },
    ],
  })

  const token = await Client.delegate({
    issuer: bob,
    audience: service.authority,
    capabilities: [
      {
        can: "store/add",
        with: alice.did(),
      },
    ],
    proofs: [proof],
  })

  const result = await access(token, {
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
    parse: StoreAdd.parse,
    check: StoreAdd.check,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
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

  const token = await Client.delegate({
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

  const result = await access(token, {
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
    parse: StoreAdd.parse,
    check: StoreAdd.check,
  })

  assert.like(result, {
    capability: {
      can: "store/add",
      with: alice.did(),
      link: null,
    },
  })
})

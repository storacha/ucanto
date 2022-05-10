import { assert } from "chai"
import { authorize, access } from "../src/lib.js"
import * as Client from "@ucanto/client"
import { Authority, SigningAuthority } from "@ucanto/authority"
import * as API from "@ucanto/interface"
import * as StoreAdd from "./capability/store/add.js"

/** did:key:z6Mkqa4oY9Z5Pf5tUcjLHLUsDjKwMC95HGXdE1j22jkbhz6r */
const alice = SigningAuthority.parse(
  "MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM="
)
/** did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob */
const bob = SigningAuthority.parse(
  "MgCYbj5AJfVvdrjkjNCxB3iAUwx7RQHVQ7H1sKyHy46Iose0BEevXgL1V73PD9snOCIoONgb+yQ9sycYchQC8kygR4qY="
)
/** did:key:z6MktafZTREjJkvV5mfJxcLpNBoVPwDLhTuMg9ng7dY4zMAL */
const mallory = SigningAuthority.parse(
  "MgCYtH0AvYxiQwBG6+ZXcwlXywq9tI50G2mCAUJbwrrahkO0B0elFYkl3Ulf3Q3A/EvcVY0utb4etiSE8e6pi4H0FEmU="
)

const service = SigningAuthority.parse(
  "MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8="
)
describe("authorize", () => {
  it("self-issued", async () => {
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

    assert.deepEqual(result, {
      ok: true,
      value: {
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
      },
    })
  })

  it("delegated", async () => {
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

    assert.equal(result.ok, true)
  })

  it("invalid", async () => {
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

    assert.equal(!result.ok, true, "can not claim other did")
    assert.match(String(result), /No proof for the claim is found/)
  })

  it("my:*", async () => {
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

    assert.ok(result.ok)
  })

  it("as:*", async () => {
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

    assert.ok(result.ok)
  })
})

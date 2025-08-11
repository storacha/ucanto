# @ucanto/validator

`@ucanto/validator` provides validation mechanisms for UCAN-based capabilities, ensuring that invocations comply with defined rules and security policies.

## What It Provides
- **Capability Validation**: Ensures UCANs are properly formatted and authorized.
- **Invocation Verification**: Checks that invocations conform to defined constraints.
- **Security Enforcement**: Applies validation policies to prevent unauthorized actions.

## How It Fits with Other Modules
- [`@ucanto/core`](../core/README.md): Uses validation mechanisms to enforce capability constraints.
- [`@ucanto/server`](../server/README.md): Ensures only valid UCANs are processed by services.
- [`@ucanto/interface`](../interface/README.md): Defines standard validation-related types.
- [`@ucanto/principal`](../principal/README.md): Verifies cryptographic signatures for UCAN validation.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation
```sh
npm install @ucanto/validator
```

## Example Usage
```ts
import { access, DID, capability, fail, Link, Schema } from '@ucanto/validator'
import { Verifier, ed25519 } from '@ucanto/principal'

// Sample identities
const alice = await ed25519.generate()
const bob = await ed25519.generate()

// Define a known capability
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
  }
})

// Alice delegates the capability to Bob
const proof = await storeAdd.delegate({
  issuer: alice,
  audience: bob,
  capabilities: [
    {
      with: alice.did(),
      can: 'store/add',
      nb: {
        link: Link.parse('bafkqaaa')
      }
    }
  ]
})

// Bob tries to invoke the capability
const invocation = storeAdd.invoke({
  issuer: bob,
  audience: alice,
  with: alice.did(),
  nb: {
    link: Link.parse('bafkqaaa')
  },
  proofs: [proof]
})

// Validate the invocation
const result = await access(await invocation.delegate(), {
  authority: alice,
  capability: storeAdd,
  principal: Verifier,
  validateAuthorization: () => ({ ok: {} }),
})

// Check result: ensure the capability is known and valid
if (result.error) {
  console.error('Capability validation failed:', result.error)
} else {
  console.log('Capability is known and valid!')
}
```

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).
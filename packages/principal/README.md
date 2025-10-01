# @ucanto/principal

`@ucanto/principal` provides identity management and cryptographic utilities for UCAN-based authentication and authorization. It enables secure key generation, signing, and verification of UCANs with multiple signature algorithms.

## What It Provides
- **Key Management**: Supports cryptographic key generation and handling.
- **Multiple Algorithms**: Ed25519, RSA, and P-256 ECDSA signature support.
- **UCAN Signing & Verification**: Ensures authenticity and integrity of UCAN tokens.
- **Identity Handling**: Manages decentralized identifiers (DIDs) for secure communication.

## Supported Signature Algorithms

| Algorithm | Description | Use Cases |
|-----------|-------------|----------|
| **Ed25519** | EdDSA signatures (default) | High performance, modern applications |
| **RSA** | RSASSA-PKCS1-v1.5 with SHA-256 | Legacy compatibility |
| **P-256** | ECDSA with NIST P-256 curve | Enterprise, NIST compliance, HSMs |

## How It Fits with Other Modules
- [`@ucanto/core`](../core/README.md): Uses principal identities for capability execution.
- [`@ucanto/server`](../server/README.md): Relies on identity verification for secure RPC handling.
- [`@ucanto/interface`](../interface/README.md): Defines standard identity-related types.
- [`@ucanto/transport`](../transport/README.md): Ensures encrypted and authenticated communication.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation
```sh
npm install @ucanto/principal
```

## Quick Start Examples

### Ed25519 (Default)
```ts
import { ed25519 } from '@ucanto/principal';

const keypair = await ed25519.generate();
const signature = await keypair.sign(new Uint8Array([1, 2, 3]));
const isValid = await keypair.verify(new Uint8Array([1, 2, 3]), signature);
console.log(`DID: ${keypair.did()}`); // did:key:z6Mk...
```

### P-256 ECDSA (NEW!)
```ts
import { P256 } from '@ucanto/principal';

const keypair = await P256.generate();
const signature = await keypair.sign(new Uint8Array([1, 2, 3]));
const isValid = await keypair.verify(new Uint8Array([1, 2, 3]), signature);
console.log(`DID: ${keypair.did()}`); // did:key:zDnae...
console.log(`Algorithm: ${keypair.signatureAlgorithm}`); // ES256
```

### RSA
```ts
import { RSA } from '@ucanto/principal';

const keypair = await RSA.generate();
const signature = await keypair.sign(new Uint8Array([1, 2, 3]));
const isValid = await keypair.verify(new Uint8Array([1, 2, 3]), signature);
console.log(`Algorithm: ${keypair.signatureAlgorithm}`); // RS256
```

## Key Management

### Serialization and Storage
```ts
import { P256 } from '@ucanto/principal';

// Generate keypair
const keypair = await P256.generate();

// Serialize for storage
const serialized = P256.format(keypair);
localStorage.setItem('keypair', serialized);

// Restore from storage
const restored = P256.parse(localStorage.getItem('keypair'));
console.log(keypair.did() === restored.did()); // true
```

### Working with DIDs
```ts
import { P256 } from '@ucanto/principal';

const keypair = await P256.generate();
const did = keypair.did(); // did:key:zDnae...

// Parse DID to get verifier
const verifier = P256.Verifier.parse(did);
const signature = await keypair.sign(payload);
const isValid = await verifier.verify(payload, signature);
```

## UCAN Integration Examples

### Creating Delegations
```ts
import { P256 } from '@ucanto/principal';
import * as Core from '@ucanto/core';

const issuer = await P256.generate();
const audience = await P256.generate();

const delegation = await Core.delegate({
  issuer,
  audience,
  capabilities: [{
    can: 'store/add',
    with: issuer.did(),
    nb: { space: 'my-space' }
  }],
  expiration: Math.floor(Date.now() / 1000) + 3600 // 1 hour
});
```

### Client Invocations
```ts
import { P256 } from '@ucanto/principal';
import * as Client from '@ucanto/client';

const service = await P256.generate();
const client = await P256.generate();

// Client invokes capability with P-256 signatures
const invocation = Client.invoke({
  issuer: client,
  audience: service,
  capability: {
    can: 'file/read',
    with: service.did(),
    nb: { path: '/documents/report.pdf' }
  },
  proofs: [delegation] // From previous example
});
```

## Comprehensive Examples

- **[P-256 Quick Start](./examples/p256-quick-start.js)** - Essential P-256 patterns
- **[P-256 Complete Examples](./examples/p256-examples.js)** - Comprehensive P-256 usage guide

Run the examples:
```sh
# Quick start examples
node packages/principal/examples/p256-quick-start.js

# Complete examples with comparisons
node packages/principal/examples/p256-examples.js
```

## When to Use Each Algorithm

- **Ed25519**: Choose for new applications requiring high performance and modern cryptography
- **P-256**: Choose for enterprise environments requiring NIST compliance or HSM integration
- **RSA**: Choose for legacy system compatibility

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).

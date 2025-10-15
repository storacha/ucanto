# ucanto

[![Core Tests](https://github.com/storacha/ucanto/actions/workflows/core.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/core.yml)
[![Principal Tests](https://github.com/storacha/ucanto/actions/workflows/principal.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/principal.yml)
[![Transport Tests](https://github.com/storacha/ucanto/actions/workflows/transport.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/transport.yml)
[![Interface Tests](https://github.com/storacha/ucanto/actions/workflows/interface.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/interface.yml)
[![Server Tests](https://github.com/storacha/ucanto/actions/workflows/server.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/server.yml)
[![Client Tests](https://github.com/storacha/ucanto/actions/workflows/client.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/client.yml)
[![Validator Tests](https://github.com/storacha/ucanto/actions/workflows/validator.yml/badge.svg)](https://github.com/storacha/ucanto/actions/workflows/validator.yml)

(u)canto is a library for [UCAN][] based [RPC][] that provides:

1. A declarative system for defining [capabilities][] and [abilities][] (roughly equivalent to HTTP
   routes in REST).
2. A system for binding [capability][] handles (a.k.a providers) to form services with built-in routing.
3. A UCAN validation system.
4. A runtime for executing UCAN capability [invocations][].
5. A pluggable transport layer.
6. A client supporting batched invocations and full [type][] inference.

> the name ucanto is a word play on UCAN and canto (one of the major divisions of a long poem)

## Quick Start - Using a UCAN Service

Most developers will use ucanto to **connect to existing UCAN services**. Here's how to get started:

### Installation

```sh
npm install @ucanto/client @ucanto/principal @ucanto/transport
```

### Basic Usage

```ts
import * as Client from '@ucanto/client'
import * as HTTP from '@ucanto/transport/http'
import { CAR } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'

// Connect to a UCAN service (e.g., w3up, your company's API, etc.)
const connection = Client.connect({
  id: { did: () => 'did:web:api.example.com' },  // Service's public DID
  codec: CAR.outbound,
  channel: HTTP.open({ url: new URL('https://api.example.com') }),
})

// Generate or load your client keys
const agent = await ed25519.generate()

// Invoke a capability on the service
const invocation = Client.invoke({
  issuer: agent,
  audience: connection.id,
  capability: {
    can: 'store/add',
    with: agent.did(),
    nb: { 
      link: 'bafybeigwflfnv7tjgpuy52ep45cbbgkkb2makd3bwhbj3ueabvt3eq43ca'
    }
  }
})

// Execute the invocation
const result = await invocation.execute(connection)
if (result.error) {
  console.error('Operation failed:', result.error)
} else {
  console.log('Success:', result.out)
}
```

> 📝 **Tested in**: [`packages/client/test/client.spec.js:22`](./packages/client/test/client.spec.js#L22) - Client invocation and execution

### Working with Delegations

UCAN services often require **delegated permissions**. Here's how to use them:

```ts
// Example 1: Using a DID (identity-based resource)
const delegation = await Client.delegate({
  issuer: serviceAgent,     // Who granted the permission
  audience: agent,          // You (the recipient) 
  capabilities: [{
    can: 'store/add',
    with: 'did:key:zAlice'  // Resource: Alice's storage (must match serviceAgent.did())
  }]
})

// Example 2: Using a resource URI (file-based resource)
const fileDelegation = await Client.delegate({
  issuer: alice,            // Alice owns the file
  audience: bob,           // Bob gets access
  capabilities: [{
    can: 'file/write',
    with: 'file:///home/alice/documents/important.txt'  // Specific file resource
  }]
})

// Use the delegation as proof in your invocation
const invocation = Client.invoke({
  issuer: agent,
  audience: connection.id,
  capability: {
    can: 'store/add', 
    with: 'did:key:zAlice',  // Must match the delegated resource
    nb: { link: 'bafybeig...' }
  },
  proofs: [delegation]  // Proof you have permission
})

const result = await invocation.execute(connection)
```

> 📝 **Tested in**: 
> - [`packages/client/test/client.spec.js:70`](./packages/client/test/client.spec.js#L70) - Delegation creation and usage
> - [`packages/server/test/readme-integration.spec.js:160`](./packages/server/test/readme-integration.spec.js#L160) - Delegation with server validation

### Batch Operations

You can send multiple invocations in a single request:

```ts
const uploadFile = Client.invoke({
  issuer: agent,
  audience: connection.id,
  capability: { can: 'store/add', with: agent.did(), nb: { link: fileCID } }
})

const deleteFile = Client.invoke({
  issuer: agent,  
  audience: connection.id,
  capability: { can: 'store/remove', with: agent.did(), nb: { link: oldFileCID } }
})

// Execute both operations together
const [uploadResult, deleteResult] = await connection.execute([uploadFile, deleteFile])
```

> 📝 **Tested in**: [`packages/client/test/client.spec.js:102`](./packages/client/test/client.spec.js#L102) - Batch invocation execution

### Advanced Delegation Patterns

UCAN supports complex delegation scenarios where users can grant permissions to others:

```ts
// Alice delegates capability to Bob for a specific namespace
const proof = await Client.delegate({
  issuer: alice,
  audience: bob,
  capabilities: [
    {
      can: 'file/link',
      with: `file:///tmp/${alice.did()}/friends/${bob.did()}/`,
    },
  ],
})

// Bob can now use the delegated permission
const aboutBob = Client.invoke({
  issuer: bob,
  audience: serviceKey,
  capability: {
    can: 'file/link',
    with: `file:///tmp/${alice.did()}/friends/${bob.did()}/about`,
    nb: { link: testCID },
  },
  proofs: [proof], // Include the delegation proof
})

// Bob tries to access Mallory's namespace (should fail)
const aboutMallory = Client.invoke({
  issuer: bob,
  audience: serviceKey,
  capability: {
    can: 'file/link',
    with: `file:///tmp/${alice.did()}/friends/${MALLORY_DID}/about`,
    nb: { link: malloryCID },
  },
  proofs: [proof], // Same proof, but wrong namespace
})

// Execute both operations
const [bobResult, malloryResult] = await connection.execute([
  aboutBob,
  aboutMallory,
])

// Bob's operation succeeds, Mallory's fails
if (bobResult.error) {
  console.error('Bob operation failed:', bobResult.error)
} else {
  console.log('Bob operation succeeded:', bobResult.out)
}

if (malloryResult.error) {
  console.log('Mallory operation failed (expected):', malloryResult.error)
} else {
  console.log('Mallory operation succeeded (unexpected)')
}
```

This demonstrates how UCAN's delegation system provides fine-grained access control where:
- ✅ **Bob succeeds** - He has delegated permission for his namespace
- ❌ **Mallory fails** - Bob doesn't have permission for Mallory's namespace
- 🔒 **Security** - The service validates the delegation chain and resource ownership

> 📝 **Tested in**: [`packages/server/test/readme-integration.spec.js:99`](./packages/server/test/readme-integration.spec.js#L99) - Advanced delegation patterns with namespace validation

## Service-Specific Examples

Different UCAN services will have different capabilities. Check their documentation for specifics:

- **w3up (Web3.Storage)**: [w3up documentation](https://github.com/web3-storage/w3up)
- **Custom Services**: See your service's API documentation

## Building Your Own Service

To create your own UCAN service, see the **[@ucanto/server documentation](./packages/server/README.md)**. This covers:

- Defining capabilities
- Creating service handlers  
- Setting up transport layers
- Deployment and security

## Advanced Topics

### Custom Transport

```ts
import * as Transport from '@ucanto/transport'

const connection = Client.connect({
  id: service,
  codec: Transport.outbound({
    encoders: { 'application/car': CAR.request },
    decoders: { 'application/dag-cbor': CBOR.response }
  }),
  channel: yourCustomChannel
})
```

### Key Management

```ts
import { ed25519 } from '@ucanto/principal'

// Generate new keys
const agent = await ed25519.generate()

// Save keys (browser)
localStorage.setItem('agent', agent.toString())

// Load keys (browser)  
const savedAgent = ed25519.parse(localStorage.getItem('agent'))

// Save keys (Node.js)
import fs from 'fs/promises'
await fs.writeFile('agent.key', agent.toString())

// Load keys (Node.js)
const keyData = await fs.readFile('agent.key', 'utf-8')
const loadedAgent = ed25519.parse(keyData)
```

> 📝 **Tested in**: [`packages/server/test/readme-examples.spec.js:54`](./packages/server/test/readme-examples.spec.js#L54) - Key generation, formatting, and parsing

## Package Overview

- [`@ucanto/client`](./packages/client/README.md) - Connect to and invoke UCAN services
- [`@ucanto/server`](./packages/server/README.md) - Build your own UCAN services  
- [`@ucanto/transport`](./packages/transport/README.md) - Transport layer implementations
- [`@ucanto/principal`](./packages/principal/README.md) - Cryptographic identity management
- [`@ucanto/core`](./packages/core/README.md) - Core UCAN primitives
- [`@ucanto/validator`](./packages/validator/README.md) - UCAN validation logic

[ucan]: https://github.com/ucan-wg/spec/
[rpc]: https://en.wikipedia.org/wiki/Remote_procedure_call
[capability]: https://github.com/ucan-wg/spec/#23-capability
[invocations]: https://github.com/ucan-wg/spec/#28-invocation
[ability]: https://github.com/ucan-wg/spec/#3242-ability
[type]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
[car]: https://ipld.io/specs/transport/car/carv1/
[dag-cbor]: https://ipld.io/specs/codecs/dag-cbor/
[cid]: https://docs.ipfs.io/concepts/content-addressing/
[did:key]: https://w3c-ccg.github.io/did-method-key/
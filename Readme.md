# ucanto

(u)canto is a library for [UCAN][] based [RPC][] that provides:

1. A client for invoking capabilities on UCAN services
2. A declarative system for defining capabilities and services
3. A UCAN validation system with delegation support
4. A pluggable transport layer
5. Full TypeScript support with type inference

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

### Working with Delegations

UCAN services often require **delegated permissions**. Here's how to use them:

```ts
// If you have a delegation from the service or another user
const delegation = await Client.delegate({
  issuer: serviceAgent,     // Who granted the permission
  audience: agent,          // You (the recipient) 
  capabilities: [{
    can: 'store/add',
    with: 'did:key:zAlice'  // What you're allowed to do
  }]
})

// Use the delegation as proof in your invocation
const invocation = Client.invoke({
  issuer: agent,
  audience: connection.id,
  capability: {
    can: 'store/add', 
    with: 'did:key:zAlice',
    nb: { link: 'bafybeig...' }
  },
  proofs: [delegation]  // Proof you have permission
})

const result = await invocation.execute(connection)
```

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
    decoders: { 'application/cbor': CBOR.response }
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

## Package Overview

- [`@ucanto/client`](./packages/client/README.md) - Connect to and invoke UCAN services
- [`@ucanto/server`](./packages/server/README.md) - Build your own UCAN services  
- [`@ucanto/transport`](./packages/transport/README.md) - Transport layer implementations
- [`@ucanto/principal`](./packages/principal/README.md) - Cryptographic identity management
- [`@ucanto/core`](./packages/core/README.md) - Core UCAN primitives
- [`@ucanto/validator`](./packages/validator/README.md) - UCAN validation logic

[ucan]: https://github.com/ucan-wg/spec/
[rpc]: https://en.wikipedia.org/wiki/Remote_procedure_call
# @ucanto/server

`@ucanto/server` provides the necessary components to build a UCAN-based RPC server. It enables services to define capabilities, validate UCANs, and process invocations securely and efficiently. This package builds on `ucanto/core` and integrates seamlessly with other `ucanto` modules.

## What It Provides

- **UCAN-Based Authorization**: Ensures that all invocations are securely verified before execution.
- **Capability Handling**: Allows services to define and manage capabilities with fine-grained access control.
- **Pluggable Transport Layer**: Supports multiple encoding and transport options.
- **Batch Invocation Processing**: Enables efficient handling of multiple invocations in a single request.

## How It Fits with Other Modules

- [`@ucanto/core`](../core/README.md): Provides the fundamental capability execution and validation logic.
- [`@ucanto/interface`](../interface/README.md): Defines shared type definitions and contracts.
- [`@ucanto/transport`](../transport/README.md): Implements encoding and transport mechanisms.
- [`@ucanto/principal`](../principal/README.md): Handles identity management and cryptographic operations.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation

```sh
npm install @ucanto/server
```

## Example Usage

### Basic Example

```ts
import * as Server from '@ucanto/server';
import * as CAR from '@ucanto/transport/car';
import * as CBOR from '@ucanto/transport/cbor';
import { ed25519 } from '@ucanto/principal';
import { capability, URI } from '@ucanto/core';

const ReadFile = capability({
  can: 'file/read',
  with: URI.match({ protocol: 'file:' })
});

export const createServer = () => {
  const read = Server.provide(ReadFile, ({ capability }) => {
    return { path: capability.with };
  });

  return Server.create({
    id: ed25519.parse(process.env.SERVICE_SECRET),
    service: { file: { read } },
    decoder: CAR,
    encoder: CBOR
  });
};
```

### Complete Filesystem Service Example

Here's a comprehensive example of building a filesystem service with UCAN capabilities:

```ts
import * as Server from '@ucanto/server';
import * as Client from '@ucanto/client';
import * as CAR from '@ucanto/transport/car';
import * as CBOR from '@ucanto/transport/cbor';
import { ed25519 } from '@ucanto/principal';
import { capability, URI, Link, Schema, Failure } from '@ucanto/core';

// 1. Define the file/link capability
const ensureTrailingDelimiter = uri => (uri.endsWith('/') ? uri : `${uri}/`)

const Add = capability({
  can: 'file/link',
  with: URI.match({ protocol: 'file:' }),
  nb: Schema.struct({
    link: Link,
  }),
  derives: (claimed, delegated) =>
    claimed.with.startsWith(ensureTrailingDelimiter(delegated.with)) ||
    new Failure(`Resource ${claimed.with} is not contained by ${delegated.with}`),
})

// 2. Create service with context
const context = { store: new Map() }
const service = {
  file: {
    link: Server.provide(Add, ({ capability, invocation }) => {
      context.store.set(capability.with, capability.nb.link)
      return {
        with: capability.with,
        link: capability.nb.link,
      }
    })
  }
}

// 3. Create server with validation
const serviceKey = await ed25519.generate()

const server = Server.create({
  id: serviceKey,
  service,
  codec: CAR.inbound,
  canIssue: (capability, issuer) => {
    if (capability.with.startsWith("file:")) {
      // Extract the DID from the file URI: file:///tmp/did:key:zABC.../path
      const url = new URL(capability.with)
      const pathParts = url.pathname.split("/")
      const did = pathParts[2] // Skip empty string and "tmp"
      return did === issuer
    }
    return false
  },
})

// 4. Create client connection
const connection = Client.connect({
  id: serviceKey,
  codec: CAR.outbound,
  channel: server, // Server directly as channel
})

// 5. Use the service
const issuerKey = await ed25519.generate()
const testCID = parseLink('bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy')

const invocation = await Client.invoke({
  issuer: issuerKey,
  audience: serviceKey,
  capability: {
    can: 'file/link',
    with: `file:///tmp/${issuerKey.did()}/me/about`,
    nb: { link: testCID },
  },
})

const result = await invocation.execute(connection)
console.log('File linked:', result.out)
```

### Key Features Demonstrated

- **Capability Definition**: How to define `file/link` capabilities with validation
- **Service Implementation**: Complete service with handlers and context
- **Authorization Logic**: `canIssue` function for resource ownership validation
- **Client Integration**: How clients connect and use the service
- **Resource Management**: File URI handling and DID extraction

### Advanced Examples

#### HTTP Server Setup

To expose your service over HTTP, you can wrap it with a Node.js HTTP server:

```ts
import * as HTTP from "node:http"
import * as Buffer from "node:buffer"

export const listen = ({ port = 8080, context = new Map() }) => {
  const fileServer = Server.create({
    id: ed25519.parse(process.env.SERVICE_SECRET),
    service: service(context),
    decoder: CAR,
    encoder: CBOR,
    canIssue: (capability, issuer) => {
      if (capability.with.startsWith("file:")) {
        const url = new URL(capability.with)
        const pathParts = url.pathname.split("/")
        const did = pathParts[2]
        return did === issuer
      }
      return false
    },
  })

  HTTP.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }

    const { headers, body } = await fileServer.request({
      headers: request.headers,
      body: Buffer.concat(chunks),
    })

    response.writeHead(200, headers)
    response.write(body)
    response.end()
  }).listen(port)
}
```

#### Delegation and Proof Chains

The server supports complex delegation scenarios:

```ts
// Alice delegates capability to Bob
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

// Bob uses the delegation
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
```

### Testing

This example is tested in the integration tests:

- **Complete workflow test**: [`readme-integration.spec.js:19`](../test/readme-integration.spec.js#L19) - End-to-end integration test
- **Component tests**: [`readme-examples.spec.js:11`](../test/readme-examples.spec.js#L11) - Individual capability and service tests

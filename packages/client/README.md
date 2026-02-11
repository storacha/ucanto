# @ucanto/client

`@ucanto/client` provides the tools necessary to create, sign, and send UCAN-based RPC invocations. It enables secure communication with UCAN-compliant services while ensuring proper authorization and delegation handling.

## What It Provides

- **UCAN Invocation Handling**: Creates and signs capability invocations.
- **Connection Management**: Manages communication with UCAN services.
- **Batch Invocation Support**: Enables multiple invocations in a single request.
- **Delegation Support**: Creates and uses authorization delegations.

## How It Fits with Other Modules
- [`@ucanto/core`](../core/README.md): Provides capability invocation and delegation logic.
- [`@ucanto/server`](../server/README.md): Processes invocations received from the client.
- [`@ucanto/interface`](../interface/README.md): Provides shared types for request and response handling.
- [`@ucanto/principal`](../principal/README.md): Manages cryptographic signing for invocations.
- [`@ucanto/transport`](../transport/README.md): Handles encoding and sending of requests.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation
```sh
npm install @ucanto/client
```

## Example Usage

### Connecting to a UCAN Service

```js
import * as Client from '@ucanto/client'
import * as HTTP from '@ucanto/transport/http'
import { CAR } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import { DID } from '@ucanto/core'

// Parse the service DID
// SERVICE_DID should be a DID like: did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi
const service = DID.parse(process.env.SERVICE_DID)
// Parse the agent's private key
// AGENT_PRIVATE_KEY should be a base64 private key like: Mg..
const issuer = ed25519.parse(process.env.AGENT_PRIVATE_KEY)

// Connect to a UCAN service
const connection = Client.connect({
  id: service,
  channel: HTTP.open({ 
    url: new URL(process.env.SERVICE_URL || 'https://api.example.com')
  }),
  codec: CAR.outbound,
})

// Create and execute invocation
const invocation = Client.invoke({
  issuer,
  audience: service,
  capability: {
    can: 'store/add',
    with: issuer.did(),
    nb: { link: 'bafybeigwflfnv7tjgpuy52ep45cbbgkkb2makd3bwhbj3ueabvt3eq43ca' } 
  }
})

const [receipt] = await connection.execute(invocation) 
// A receipt is a signed result from the service proving the invocation was processed.
console.log(receipt.out.error ? 'Failed:' : 'Success:', receipt.out)
```

> 📝 **Tested in**: [`client-readme-snippets.spec.js`](./test/client-readme-snippets.spec.js)

### Using Server as Channel (for Testing)

For testing or local development, you can use a UCAN server directly as a channel without HTTP. See the [`@ucanto/server` README](../server/README.md) for details on setting up a server.

## Setup Instructions

### Environment Variables

**AGENT_PRIVATE_KEY**
Set the key your client should use to sign UCAN invocations. You can generate Ed25519 keys with the ucanto library.

#### Usage

Create a file called `generate-keys.js`:

```javascript
import { ed25519 } from '@ucanto/principal'

async function generateKeys() {
  // Use extractable keys if you need to serialize for env vars.
  const keypair = await ed25519.generate({ extractable: true })
  
  const privateKey = ed25519.format(keypair)
  
  console.log('AGENT_PRIVATE_KEY=' + privateKey)
}

generateKeys().catch(console.error)
```

> 📝 **Tested in**: [`client-readme-snippets.spec.js`](./test/client-readme-snippets.spec.js)

Then run it:

```bash
node generate-keys.js
```

**SERVICE_DID**
Set the DID of the service you want to connect to. Check the service's documentation for their public DID.

**SERVICE_URL** (Optional)
If you're connecting to a custom service, set both `SERVICE_DID` and `SERVICE_URL` environment variables.


For example, Storacha has following `SERVICE_DID` and `SERVICE_URL`:

```bash
# Storacha uses these default values:
SERVICE_DID="did:web:up.storacha.network"
SERVICE_URL="https://up.storacha.network"
```

Set your environment variables like so:
```bash
AGENT_PRIVATE_KEY="your_generated_private_key_here" \
SERVICE_DID="did:key:service_provider_did_here" \
```


For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).

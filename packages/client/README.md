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
```js
import * as Client from '@ucanto/client'
import * as HTTP from '@ucanto/transport/http'
import { CAR } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import { Receipt, Message } from '@ucanto/core'

const service = ed25519.parse(process.env.SERVICE_ID)
const issuer = ed25519.parse(process.env.CLIENT_KEYPAIR)

// Mock fetch that simulates a UCAN service
const mockFetch = async (url, input) => {
  const { invocations } = await CAR.request.decode(input)

  const receipts = await Promise.all(
    invocations.map(inv => Receipt.issue({
      ran: inv.cid,                      // Link to the invocation
      issuer: service,                   // Service signs the receipt
      result: { ok: { status: 'success' } } // Fake success
    }))
  )

  const message = await Message.build({ receipts })
  const response = await CAR.response.encode(message)

  return {
    ok: true,
    headers: new Map(Object.entries(response.headers)),
    arrayBuffer: () => response.body,
  }
}

// Connect to mock service
const connection = Client.connect({
  id: service,
  channel: HTTP.open({ url: new URL('https://api.example.com'), fetch: mockFetch }),
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

### Run it:

⚠️ These are test keys. Replace them with your own service ID and client keypair before using in production.

```bash
SERVICE_ID="MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8=" \
CLIENT_KEYPAIR="MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM=" \
node example.js
```


### Connecting to a Real Service

Replace the `mockFetch` in the example with the real `fetch` and a valid service URL:

```js
channel: HTTP.open({ url: new URL('https://api.example.com'), fetch })
```

**What's happening:** UCAN services expect CAR-encoded requests and return CAR-encoded receipts with cryptographic signatures. The mock simulates this entire flow so the example works without a real service.

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).
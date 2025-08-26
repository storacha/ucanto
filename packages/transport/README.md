# @ucanto/transport

`@ucanto/transport` provides encoding, decoding, and transport mechanisms for UCAN-based RPC. It handles the serialization and network communication needed for secure UCAN message exchange between clients and servers.

## What It Provides
- **CAR Encoding/Decoding**: Serializes UCAN messages in Content Addressable Archive format.
- **HTTP Transport**: Enables UCAN communication over HTTP with proper content negotiation.
- **Pluggable Codec System**: Supports multiple encoding formats with inbound/outbound codecs.
- **Legacy Support**: Maintains compatibility with older CBOR-based UCAN message formats.

## How It Fits with Other Modules
- [`@ucanto/client`](../client/README.md): Uses transport to communicate with services.
- [`@ucanto/server`](../server/README.md): Uses transport to receive and respond to requests.
- [`@ucanto/core`](../core/README.md): Provides the UCAN message structures that get transported.
- [`@ucanto/interface`](../interface/README.md): Defines transport-related types and interfaces.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation
```sh
npm install @ucanto/transport
```

## Example Usage
```js
import * as HTTP from '@ucanto/transport/http'
import { CAR } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import { invoke, Message, Receipt } from '@ucanto/core'

// Parse the service DID (public key) 
// SERVICE_DID should be a DID like: did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi
const service = ed25519.Verifier.parse(process.env.SERVICE_DID)
// Parse the agent's private key
// AGENT_PRIVATE_KEY should be a base64 private key like: Mg..
const issuer = ed25519.parse(process.env.AGENT_PRIVATE_KEY)

// Mock fetch that simulates a UCAN service
const mockFetch = async (url, init) => {
  console.log('Sending request to:', url)
  console.log('Request headers:', init.headers)
  
  // Simulate a service response with a receipt
  const { invocations } = await CAR.request.decode(init)
  const receipts = await Promise.all(
    invocations.map(inv => Receipt.issue({
      ran: inv.cid,
      issuer: service,
      result: { ok: { status: 'added' } }
    }))
  )
  
  const responseMessage = await Message.build({ receipts })
  const response = await CAR.response.encode(responseMessage)    
  return new Response(response.body, { headers: response.headers })
}

// Create UCAN invocation
const invocation = invoke({
  issuer,
  audience: service,
  capability: {
    can: 'store/add',
    with: issuer.did(),
    nb: { link: 'bafybeigwflfnv7tjgpuy52ep45cbbgkkb2makd3bwhbj3ueabvt3eq43ca' }
  }
})

// Package for transport
const message = await Message.build({ invocations: [invocation] })
const request = await CAR.request.encode(message)

// Create HTTP channel and send
const channel = HTTP.open({ 
  url: new URL('https://api.example.com'),
  fetch: mockFetch
})
const response = await channel.request(request)

// Unpack response  
const replyMessage = await CAR.response.decode(response)
console.log('Received:', replyMessage.receipts.size, 'receipts')
```

### Run it:
⚠️ These are test keys. Replace them with your own service ID and client keypair before using in production.

```bash
SERVICE_ID="MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8=" \
AGENT_PRIVATE_KEY="MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM=" \
node example.js
```



### Advanced: Pluggable Codecs

Transport provides a codec system for different encoding strategies:

```js
import { Codec, CAR } from '@ucanto/transport'

// Outbound codec (client-side)
const outbound = Codec.outbound({
  encoders: { 'application/vnd.ipld.car': CAR.request },
  decoders: { 'application/vnd.ipld.car': CAR.response },
})

// Inbound codec (server-side)  
const inbound = Codec.inbound({
  decoders: { 'application/vnd.ipld.car': CAR.request },
  encoders: { 'application/vnd.ipld.car': CAR.response },
})
```

**What's happening:** Transport handles the low-level details of UCAN communication - encoding messages into CAR format, managing HTTP headers, content negotiation, and error handling. Most developers use `@ucanto/client` which handles this automatically.

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).
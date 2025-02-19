# @ucanto/client

`@ucanto/client` provides the tools necessary to create, sign, and send UCAN-based RPC invocations. It enables secure communication with UCAN-compliant services while ensuring proper authorization and delegation handling.

## What It Provides
- **UCAN Invocation Handling**: Creates and signs capability invocations.
- **Batch Invocation Support**: Enables multiple invocations in a single request.
- **Secure Communication**: Ensures interactions are cryptographically signed and verified.

## How It Fits with Other Modules
- [`@ucanto/core`](../core/README.md): Defines capability structures and execution logic.
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
```ts
import * as Client from '@ucanto/client';
import { ed25519 } from '@ucanto/principal';

const service = ed25519.Verifier.parse(process.env.SERVICE_ID);
const issuer = ed25519.Signer.parse(process.env.CLIENT_KEYPAIR);

const invocation = await Client.invoke({
  issuer,
  audience: service,
  capability: {
    can: 'file/read',
    with: 'file://example.txt'
  }
});

const response = await client.execute(invocation);
if (response.error) {
  console.error('Invocation failed:', response.error);
} else {
  console.log('Invocation succeeded:', response.result);
}
```

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).
# @ucanto/principal

`@ucanto/principal` provides identity management and cryptographic utilities for UCAN-based authentication and authorization. It enables secure key generation, signing, and verification of UCANs.

## What It Provides
- **Key Management**: Supports cryptographic key generation and handling.
- **UCAN Signing & Verification**: Ensures authenticity and integrity of UCAN tokens.
- **Identity Handling**: Manages decentralized identifiers (DIDs) for secure communication.

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

## Example Usage
```ts
import { ed25519 } from '@ucanto/principal';

const keypair = ed25519.generate();
const signature = keypair.sign(new Uint8Array([1, 2, 3]));
const isValid = keypair.verify(new Uint8Array([1, 2, 3]), signature);
```

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).

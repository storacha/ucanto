# @ucanto/core

`@ucanto/core` provides the foundational components for defining, validating, and executing UCAN-based Remote Procedure Calls (RPC). It serves as the core module for the `ucanto` ecosystem, enabling capability-based access control and secure interactions between clients and services.

## What It Provides
- **Capability Definition & Validation**: Enables the creation of structured capabilities with clear semantics.
- **UCAN Invocation Execution**: Supports processing and verifying UCAN-based RPC calls.
- **Extensibility**: Designed to integrate seamlessly with other `ucanto` modules.

## How It Fits with Other Modules
- [`@ucanto/server`](../server/README.md): Builds on `ucanto/core` to provide a complete UCAN-based RPC server.
- [`@ucanto/interface`](../interface/README.md): Provides shared type definitions and contracts.
- [`@ucanto/transport`](../transport/README.md): Implements encoding and transport mechanisms.
- [`@ucanto/principal`](../principal/README.md): Handles identity management and cryptographic operations.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation
```sh
npm install @ucanto/core
```

## Example Usage
```ts
import { capability, URI, Link } from '@ucanto/core';

const AddFile = capability({
  can: 'file/add',
  with: URI.match({ protocol: 'file:' }),
  nb: { link: Link }
});
```

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).
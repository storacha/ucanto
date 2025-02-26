# @ucanto/validator

`@ucanto/validator` provides validation mechanisms for UCAN-based capabilities, ensuring that invocations comply with defined rules and security policies.

## What It Provides
- **Capability Validation**: Ensures UCANs are properly formatted and authorized.
- **Invocation Verification**: Checks that invocations conform to defined constraints.
- **Security Enforcement**: Applies validation policies to prevent unauthorized actions.

## How It Fits with Other Modules
- [`@ucanto/core`](../core/README.md): Uses validation mechanisms to enforce capability constraints.
- [`@ucanto/server`](../server/README.md): Ensures only valid UCANs are processed by services.
- [`@ucanto/interface`](../interface/README.md): Defines standard validation-related types.
- [`@ucanto/principal`](../principal/README.md): Verifies cryptographic signatures for UCAN validation.

For an overview and detailed usage information, refer to the [main `ucanto` README](../../Readme.md).

## Installation
```sh
npm install @ucanto/validator
```

## Example Usage
```ts
import { capability, URI } from '@ucanto/core';
import { validate } from '@ucanto/validator';

const readFile = capability({
  can: 'file/read',
  with: URI.match({ protocol: 'file:' })
});

const isValid = validate({
  capability: readFile,
  proof: someProof,
  with: 'file://example.txt'
});

if (isValid) {
  console.log('Capability is valid');
} else {
  console.error('Invalid capability');
}
```

For more details, see the [`ucanto` documentation](https://github.com/storacha/ucanto).
# ucanto

(u)canto is a library for [UCAN][] based [RPC][] which provides:

1. A system for defining services as a map of UCAN [capability][] handlers.
2. A runtime for executing capabilities through UCAN [invocations][].
3. A pluggable transport layer.
4. A [capability][] based routing system.
5. Batched invocation with precise type inference.


> the name ucanto is a word play on UCAN and canto (one of the major divisions of a long poem)


## High level overview

### Services

This library defines a "service" as a hierarchical mapping of (cap)[ability][] _(The `can` field of the capability)_ to a handler. To make it more clear, lets define a simple service that provides `{ can: "intro/echo", with: "data:*" }` capability which echoes back the message, and `{ can: "math/sqrt", with: "*", n: number }` capability which returns square root of a given number.

```ts
import type {Invocation, Result} from "ucanto"

type Echo = {
  can: "intro/echo"
  with: string
}

export const echo = async({ capability }: Invocation<Echo>):Promise<Result<string, InvalidInputError>> => {
  const result = !capability.with.startsWith('data:')
    ? new InvalidInputError(`Capability "intro/echo" expects with to be a data URL, instead got ${capability.with}`)
    : !capability.with.startsWith('data:text/plain,')
    ? new InvalidInputError(`Capability "intro/echo" currently only support data URLs in text/plain encoding`)
    : { ok: true, value: capability.with.slice('data:text/plain,'.length) }
      
  return result
}

export const sqrt = async({ capabality }:Invocation<Sqrt>):Promise<Result<number, InvalidInputError>> => {
  const result = capability.n < 0
    ? new InvalidInputError(`Capability "math/sqrt" only operates on positive numbers, instead got ${capability.n}`)
    : { ok: true, Math.sqrt(capability.n) }
}


// heirarchical mapping of (cap)abilities with corresponding handlers
// 'intro/echo' -> .intro.echo
// 'math/sqrt' -> .math.sqrt
export const service = {
  intro: { echo },
  math: { sqrt }
}


class InvalidInputError extends Error {
  constructor(input) {
     super(`Invalid input: ${input}`)
  }
}
```

There are few requirements that all handlers MUST meet:

1. Handler takes a single argument of type `Service.Invocation<Capability>` which is a deserialized representation of a UCAN invocation with a **single** concrete capability. Although the invocation must take a single capability, you can use a [type union][] to accept multiple types of input data.
   > Right now it MUST have `can` field but that requirement may be removed in the future.
2. Handler MUST return `Result` type
   > Errors happen, and it's best to specify what kind in types. While you can simply do `Result<T, Error>`, it's recommended to be more specific.
   
 Please note:
 
 1. We have not done any UCAN validation here to keep things simple _(but also "intro/echo" capability can be self issued :P)_. That is something you MUST do in your handler though.
 2. We defined our service as `{ intro: { echo }, math: { sqrt } }` which maps with corresponding (cap)abilities and provides definitions for the routing system.
 
 
 ### Transport
 
 The library provides a pluggable transport architecture so you can expose a service in various transport encodings. To do so you have to provide:
 
 1. `decoder` that will take `{ headers: Record<string, string>, body: Uint8Array }` object and decode it into `{ invocations: Invocation[] }`.
 2. `encoder` that will take `unknown[]` (corresponding to values returned by handlers) and encode it into `{ headers: Record<string, string>, body: Uint8Array }`.
 3. `service` implementation
 
 > Note that the actual encoder / decoder types are more complicated as they capture capability types, the number of invocations, and corresponding return types. This allows them to provide good type inference. But ignoring those details, that is what they are in a nutshell.
 
 In the example below we create a server which will take invocations encoded in [CAR][] format and produce responses encoded in [DAG-CBOR][] format. There are a few other options provided by tbe library, and you could also bring your own.
 
 ```ts
import * as Server from "ucanto/src/server.js"
import * as Transport from "ucanto/src/transport.js"

const server = Server.create({
  service,
  decoder: Transport.CAR,
  encoder: Transport.CBOR,
})
 ```
 
 ### Routing
 
 The server defined above can:
 
 1. Take requests in `{ headers: Record<string, string>, body: Uint8Array }` format.
 1. Decode them into `Invocation`s.
 1. Route and execute corresponding (cap)[ability][] handler.
 1. Encode results back into ``{ headers: Record<string, string>, body: Uint8Array }` format.
 
 All you need to do is simply pass the request:
 
 ```js
 export const handler = async (payload:{headers:Record<string, string>, body:Uint8Array}):Promise<{headers:Record<string, string>, body:Uint8Array}> =>
   server.request(payload)
 ```
 
 **Please note:** this library intentionally does not deal with any networking, so that you could plug it into whatever runtime you need as long as you can represent request responses as `{ headers: Record<string, string>, body: Uint8Array }`
 
 > Streaming is not currently supported, but may be added in the future.
 
 
 ## Client
 
Client implementation can be used to issue and execute UCAN invocations. Here is an example of invoking capabilities defined by our service earlier:

```ts
import * as Client from "ucanto/src/client.js"
import * as DID from "@ipld/dag-ucan"
import { keypair } from "ucans"

const service = DID.parse("did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169")

// did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi
const alice = keypair.EdKeypair.fromSecretKey("U+bzp2GaFQHso587iSFWPSeCzbSfn/CbNHEz7ilKRZ1UQMmMS7qq4UhTzKn3X9Nj/4xgrwa+UqhMOeo4Ki8JUw==")


const demo1 = async (connection) => {
  const hello = await Client.invoke({
    issuer: alice,
    audience: service
    can: "intro/echo",
    with: "data:text/plain,hello world"
  })
  
  const result = await hello.execute(connection)  
  if (result.ok) {
    console.log("got echo back", result.value)
  } else {
    console.error("oops", result)
  }
}
```

Note that the client will get complete type inference as long as `connection` captures a type of the service on the other side of the wire.

### Transport

Just like the server, the client has a pluggable transport layer which you provide when you create a connection. The transport layer consists of:
 
 1. `encoder` takes `{ invocations: IssuedInvocation[] }` objects and turn them into `{ headers: Record<string, string>, body: Uint8Array }`.
 2. `decoder` takes `{ headers: Record<string, string>, body: Uint8Array }` and turns it into `unknown[]` (that correspond to return values for invocations).
 3. `channel` transport channel that takes request delivers it to the server and returns promise of the response when one is received from the server, which looks like
 `{ request(payload:{headers: Record<string, string>, body: Uint8Array}):Promise<{headers: Record<string, string>, body: Uint8Array}> }`
 
 We could create an in-process connection with our service simply by providing service as a channel:
 
 ```ts
const connection = Client.connect({
  encoder: Transport.CAR,  // encode as CAR because server decods from car
  decoder: Transport.CBOR, // decode as CBOR because server encodes as CBOR
  channel: server,         // simply pass the server
})
 ```
 
 In practice you probably would want client/server communication to happen across a wire, or at least across processes. You can bring your own transport channel, or choose an existing one. For example:
 
 ```ts
import * as Transport from "ucanto/src/transport.js"

 const connection = Client.connect({
  encoder: Transport.CAR,  // encode as CAR because server decodes from car
  decoder: Transport.CBOR, // decode as CBOR because server encodes as CBOR
  /** @type {Transport.Channel<typeof service>} */
  channel: Transport.HTTP.open({ url: new URL(process.env.SERVICE_URL) }) // simple `fetch` wrapper 
})
 ```

> Note: That in that case, you ned to provide type annotations, so the client can provide inference for requests and return types

### Batching & Proof chains

The library supports batch invocations and takes care of all the nitty gritty details when it comes to UCAN delegation chains, specifically taking chains apart to encode as blocks in CAR and putting them back together into a chain on the other side. All you need to do is provide a delegation in the proofs:

```ts
import * as Client from "ucanto/src/client.js"
import * as DID from "@ipld/dag-ucan"
import { keypair } from "ucans"

const service = DID.parse("did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169")

// did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi
const alice = keypair.EdKeypair.fromSecretKey("U+bzp2GaFQHso587iSFWPSeCzbSfn/CbNHEz7ilKRZ1UQMmMS7qq4UhTzKn3X9Nj/4xgrwa+UqhMOeo4Ki8JUw==")
// did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob
const bob = keypair.EdKeypair.fromSecretKey("G4+QCX1b3a45IzQsQd4gFMMe0UB1UOx9bCsh8uOiKLER69eAvVXvc8P2yc4Iig42Bv7JD2zJxhyFALyTKBHipg==")


const demo2 = async (connection) => {
  const bye = await Client.invoke({
    issuer: alice,
    audience: service
    can: "intro/echo",
    with: "data:text/plain,bye"
  })
  
  const sqrt = (n) => Client.invoke({
    issuer: alice,
    audience: service,
    can: "math/sqrt",
    with: alice.did(),
    n,
    proofs: [UCAN.parse(process.env.UCAN)]
  })
  
  const [r1, r2] = batch(bye, await sqrt(9)).execute(connection)
  
  if (r1.ok) {
    console.log("got echo back", r1.value)
  } else {
    console.error("oops", r1)
  }
  
  if (r2.ok) {
    console.log("got sqrt", r2.value)
  } else {
    console.log("oops", r2)
  }
}
```

## Future

Intentions are that in the future we may provide a more powerful GraphQL inspired invocation interface along the lines of:

```ts
Client.query({
  r1: select({ intro: { echo: { with: "data:text/plain,hello beautiful" } } }),
  // pass a request and specify which fields to select
  r2: select({ store: { add: { with: alice.did(), link: cid } }, { url: true, status: true })
})
```
 

[UCAN]:https://github.com/ucan-wg/spec/
[RPC]:https://en.wikipedia.org/wiki/Remote_procedure_call
[capability]:https://github.com/ucan-wg/spec/#23-capability
[invocations]:https://github.com/ucan-wg/spec/#28-invocation
[ability]:https://github.com/ucan-wg/spec/#3242-ability
[type union]:https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
[CAR]:https://ipld.io/specs/transport/car/carv1/
[DAG-CBOR]:https://ipld.io/specs/codecs/dag-cbor/

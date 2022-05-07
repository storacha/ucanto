import type { Phantom, Await } from "@ipld/dag-ucan"
import * as UCAN from "@ipld/dag-ucan"
import type {
  ServiceInvocations,
  IssuedInvocation,
  Invocation,
  ExecuteBatchInvocation,
} from "./lib.js"

export interface EncodeOptions {
  readonly hasher?: UCAN.MultihashHasher
}

export interface Channel<T> extends Phantom<T> {
  request<I extends ServiceInvocations<T>[]>(
    request: HTTPRequest<Batch<I>>
  ): Await<HTTPResponse<ExecuteBatchInvocation<I, T>>>
}

export interface RequestEncoder {
  encode<I extends IssuedInvocation[]>(
    input: Batch<I>,
    options?: EncodeOptions
  ): Await<HTTPRequest<Batch<I>>>
}

export interface RequestDecoder {
  decode<I extends Invocation[]>(
    request: HTTPRequest<Batch<I>>
  ): Await<Batch<I>>
}

export interface ResponseEncoder {
  encode<I>(result: I, options?: EncodeOptions): Await<HTTPResponse<I>>
}

export interface ResponseDecoder {
  decode<I>(response: HTTPResponse<I>): Await<I>
}

export interface HTTPRequest<T = unknown> extends Phantom<T> {
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface HTTPResponse<T = unknown> extends Phantom<T> {
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface Packet<I extends Invocation[]> extends Phantom<I> {
  invocations: Block[]
  delegations: Map<string, Block>
}

export interface Block<
  C extends UCAN.Capability = UCAN.Capability,
  A extends number = number
> {
  readonly cid: UCAN.Proof<C, A>
  readonly bytes: UCAN.ByteView<UCAN.UCAN<C>>
  readonly data: UCAN.View<C>
}

export interface Batch<In extends unknown[]> {
  invocations: In
}

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
    request: HTTPRequest<I>
  ): Await<HTTPResponse<ExecuteBatchInvocation<I, T>>>
}

export interface RequestEncoder {
  encode<I extends IssuedInvocation[]>(
    invocations: I,
    options?: EncodeOptions
  ): Await<HTTPRequest<I>>
}

export interface RequestDecoder {
  decode<I extends Invocation[]>(request: HTTPRequest<I>): Await<I>
}

export interface ResponseEncoder {
  encode<I>(result: I, options?: EncodeOptions): Await<HTTPResponse<I>>
}

export interface ResponseDecoder {
  decode<I>(response: HTTPResponse<I>): Await<I>
}

export type InferInvocation<T> = T extends []
  ? []
  : T extends [IssuedInvocation<infer C>, ...infer Rest]
  ? [Invocation<C>, ...InferInvocation<Rest>]
  : T extends Array<IssuedInvocation<infer U>>
  ? Invocation<U>[]
  : never

export interface HTTPRequest<T = unknown> extends Phantom<T> {
  method?: string
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
  C extends [UCAN.Capability, ...UCAN.Capability[]] = [
    UCAN.Capability,
    ...UCAN.Capability[]
  ],
  A extends number = number
> {
  readonly cid: UCAN.Proof<C[number], A>
  readonly bytes: UCAN.ByteView<UCAN.UCAN<C[number]>>
}

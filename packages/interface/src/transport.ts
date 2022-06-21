import type { Phantom, Await } from '@ipld/dag-ucan'
import * as UCAN from '@ipld/dag-ucan'
import type {
  ServiceInvocation,
  InferServiceInvocations,
  InferInvocations,
  Capability,
} from './lib.js'

/**
 * This utility type can be used in place of `T[]` where you
 * want TS to infer things as tuples as opposed to array. This

 */
export type Tuple<T = unknown> = [T, ...T[]]

export interface EncodeOptions {
  readonly hasher?: UCAN.MultihashHasher
}

export interface Channel<T> extends Phantom<T> {
  request<I extends Tuple<ServiceInvocation<UCAN.Capability, T>>>(
    request: HTTPRequest<I>
  ): Await<HTTPResponse<InferServiceInvocations<I, T>>>
}

export interface RequestEncoder {
  encode<I extends Tuple<ServiceInvocation>>(
    invocations: I,
    options?: EncodeOptions
  ): Await<HTTPRequest<I>>
}

export interface RequestDecoder {
  decode<I extends Tuple<ServiceInvocation>>(
    request: HTTPRequest<I>
  ): Await<InferInvocations<I>>
}

export interface ResponseEncoder {
  encode<I>(result: I, options?: EncodeOptions): Await<HTTPResponse<I>>
}

export interface ResponseDecoder {
  decode<I>(response: HTTPResponse<I>): Await<I>
}

export interface HTTPRequest<T = unknown> extends Phantom<T> {
  method?: string
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface HTTPResponse<T = unknown> extends Phantom<T> {
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface Block<
  C extends [Capability, ...Capability[]] = [Capability, ...Capability[]],
  A extends number = number
> {
  readonly cid: UCAN.Proof<C[number], A>
  readonly bytes: UCAN.ByteView<UCAN.UCAN<C[number]>>
}

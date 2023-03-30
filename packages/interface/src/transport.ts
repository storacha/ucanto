import type {
  Link,
  Block as IPLDBlock,
  Version as LinkVersion,
} from 'multiformats'
import type { Phantom, Await } from '@ipld/dag-ucan'
import * as UCAN from '@ipld/dag-ucan'
import type {
  ServiceInvocation,
  InferWorkflowReceipts,
  InferInvocations,
  Receipt,
  Invocation,
} from './lib.js'

/**
 * This utility type can be used in place of `T[]` where you
 * want TS to infer things as tuples as opposed to array. This

 */
export type Tuple<T = unknown> = [T, ...T[]]

export interface EncodeOptions {
  readonly hasher?: UCAN.MultihashHasher
}

export interface RequestEncodeOptions extends EncodeOptions {
  accept?: string
}

export interface Channel<T extends Record<string, any>> extends Phantom<T> {
  request<I extends Tuple<ServiceInvocation<UCAN.Capability, T>>>(
    request: HTTPRequest<I>
  ): Await<HTTPResponse<InferWorkflowReceipts<I, T> & Tuple<Receipt>>>
}

export interface RequestEncoder {
  encode<I extends Tuple<ServiceInvocation>>(
    invocations: I,
    options?: RequestEncodeOptions
  ): Await<HTTPRequest<I>>
}

export interface RequestDecoder {
  decode<I extends Tuple<ServiceInvocation>>(
    request: HTTPRequest<I>
  ): Await<InferInvocations<I>>
}

export interface ResponseEncoder {
  encode<I extends Tuple<Receipt<any, any>>>(
    result: I,
    options?: EncodeOptions
  ): Await<HTTPResponse<I>>
}

export interface ResponseDecoder {
  decode<I extends Tuple<Receipt<any, any>>>(
    response: HTTPResponse<I>
  ): Await<I>
}

export interface HTTPRequest<T = unknown> extends Phantom<T> {
  method?: string
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface HTTPResponse<T = unknown> extends Phantom<T> {
  status?: number
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

/**
 * Extends {@link IPLDBlock} with an optional `data` field.
 */
export interface Block<
  T extends unknown = unknown,
  Format extends number = number,
  Alg extends number = number,
  V extends LinkVersion = 1
> extends IPLDBlock<T, Format, Alg, V> {
  data?: T
}

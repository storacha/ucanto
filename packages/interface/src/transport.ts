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
  Workflow,
  AgentMessageModel,
  ByteView,
  Invocation,
  AgentMessage,
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
  /**
   * If provided will be set as an `accept` header of the request.
   */
  accept?: string
}

export interface Channel<T extends Record<string, any>> extends Phantom<T> {
  request<I extends AgentMessage, O extends AgentMessage>(
    request: HTTPRequest<I>
  ): Await<HTTPResponse<O>>
}

export interface RequestEncoder {
  encode<T extends AgentMessage>(
    message: T,
    options?: RequestEncodeOptions
  ): Await<HTTPRequest<T>>
}

export interface RequestDecoder {
  decode<T extends AgentMessage>(request: HTTPRequest<T>): Await<T>
}

export interface ResponseEncoder {
  encode<T extends AgentMessage>(message: T, options?: EncodeOptions): Await<T>
}

export interface ResponseDecoder {
  decode<T extends AgentMessage>(response: HTTPResponse<T>): Await<T>
}

export interface HTTPRequest<T extends AgentMessage = AgentMessage> {
  method?: string
  headers: Readonly<Record<string, string>>
  body: ByteView<T>
}

export interface HTTPResponse<T extends AgentMessage = AgentMessage> {
  status?: number
  headers: Readonly<Record<string, string>>
  body: ByteView<T>
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

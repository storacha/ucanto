import type { Phantom, Await } from "../api.js"
import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
import type { sha256 } from "multiformats/hashes/sha2"

export interface RequestEncoder {
  encode<I extends API.IssuedInvocation[]>(
    input: API.Batch<I>
  ): Await<HTTPRequest<API.Batch<I>>>
}

export interface RequestDecoder {
  decode<I extends API.Invocation[]>(
    request: HTTPRequest<API.Batch<I>>
  ): Await<API.Batch<I>>
}

export interface ResponseEncoder {
  encode<I>(result: I): Await<HTTPResponse<I>>
}

export interface ResponseDecoder {
  decode<I>(response: HTTPResponse<I>): Await<I>
}

export interface HTTPRequest<T> extends Phantom<T> {
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface HTTPResponse<T> extends Phantom<T> {
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

export interface Packet<I extends API.Invocation[]> extends Phantom<I> {
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

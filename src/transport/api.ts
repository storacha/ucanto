import type { Phantom, Await } from "../api.js"
import * as API from "../api.js"
import * as UCAN from "@ipld/dag-ucan"
import type { sha256 } from "multiformats/hashes/sha2"

export interface Encoder {
  encode<I extends API.IssuedInvocation[]>(
    batch: API.Batch<I>
  ): Await<HTTPRequest<I>>
}

export interface Decoder {
  decode<I extends API.Invocation[]>(
    request: HTTPRequest<I>
  ): Await<API.Batch<I>>
}

export interface Codec extends Encoder, Decoder {}

export interface HTTPRequest<I> extends Phantom<I> {
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

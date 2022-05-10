import * as UCAN from "@ipld/dag-ucan"
import type { DID, Identity, Signer, Verifier, Signature } from "@ipld/dag-ucan"

export type { DID, Identity, Signer, Verifier, Signature }

export interface AuthorityParser<A extends number = number> {
  parse(did: UCAN.DID): Authority<A>

  // or<B extends number>(parser: AuthorityParser<B>): AuthorityParser<A | B>
}

export interface Authority<A extends number = number>
  extends ArrayBufferView,
    UCAN.Authority<A> {
  bytes: Uint8Array
}

export interface SigningAuthority<A extends number = number>
  extends ArrayBufferView,
    Identity,
    Verifier<A>,
    Signer<A> {
  authority: Authority<A>
  bytes: Uint8Array
  // secret: Uint8Array
}

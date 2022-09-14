export * as UCAN from '@ipld/dag-ucan'
import type * as UCAN from '@ipld/dag-ucan'

export interface PrincipalParser<A extends number = number> {
  parse(did: UCAN.DID): Principal<A>
}

export interface Principal<A extends number = number>
  extends ArrayBufferView,
    UCAN.Verifier<A> {
  bytes: Uint8Array
}

export interface SigningPrincipal<A extends number = number>
  extends Principal<A>,
    UCAN.Signer<A> {
  principal: Principal<A>
  bytes: Uint8Array
  // secret: Uint8Array
}

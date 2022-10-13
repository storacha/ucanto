import { Signer, Verifier, ByteView, UCAN, Await } from '@ucanto/interface'
import * as Signature from '@ipld/dag-ucan/signature'

export * from '@ucanto/interface'

type CODE = typeof Signature.EdDSA
type ALG = 'EdDSA'

export interface EdSigner<M extends string = 'key'>
  extends Signer<M, CODE>,
    UCAN.Verifier<M, CODE> {
  readonly signer: EdSigner<M>
  readonly verifier: EdVerifier<M>

  readonly code: 0x1300
  toArchive(): ByteView<EdSigner<M>>
}

export interface EdVerifier<M extends string = 'key'>
  extends Verifier<M, CODE> {
  readonly code: 0xed
  readonly signatureCode: CODE
  readonly signatureAlgorithm: ALG

  encode: () => ByteView<EdVerifier<M>>
}

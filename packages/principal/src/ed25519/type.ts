import { Signer, Verifier, ByteView, DID } from '@ucanto/interface'
import * as Signature from '@ipld/dag-ucan/signature'

export * from '@ucanto/interface'

type CODE = typeof Signature.EdDSA
type ALG = 'EdDSA'

export interface EdSigner extends Signer<DID<'key'>, CODE> {
  readonly signatureCode: CODE
  readonly signatureAlgorithm: ALG
  readonly code: 0x1300

  readonly verifier: EdVerifier

  encode(): ByteView<EdSigner & CryptoKeyPair>

  toArchive(): {
    id: DID<'key'>
    keys: { [K: DID<'key'>]: ByteView<Signer<DID<'key'>, CODE> & CryptoKey> }
  }
}

export interface EdVerifier extends Verifier<DID<'key'>, CODE> {
  readonly code: 0xed
  readonly signatureCode: CODE
  readonly signatureAlgorithm: ALG
}

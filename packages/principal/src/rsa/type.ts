import { Signer, Verifier, ByteView, UCAN, Await } from '@ucanto/interface'

export * from '@ucanto/interface'

type CODE = 0xd01205
type ALG = 'RS256'

export interface RSASigner<M extends string = 'key'>
  extends Signer<M, CODE>,
    UCAN.Verifier<M, CODE> {
  readonly signer: RSASigner<M>
  readonly verifier: RSAVerifier<M>

  readonly code: 0x1305

  key: CryptoKey | null

  toCryptoKey: () => Await<CryptoKey>
}

export interface RSAVerifier<M extends string = 'key'>
  extends Verifier<M, CODE> {
  readonly code: 0x1205
  readonly signatureCode: CODE
  readonly signatureAlgorithm: ALG
  key: CryptoKey | null

  export: () => Await<ByteView<RSAVerifier<M>>>
  toCryptoKey: () => Await<CryptoKey>
}

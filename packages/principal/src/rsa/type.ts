import { Verifier, Signer, DID } from '@ucanto/interface'

export * from '@ucanto/interface'

type CODE = 0xd01205
type ALG = 'RS256'

export interface RSASigner extends Signer<DID<'key'>, CODE> {
  readonly signer: RSASigner
  readonly verifier: RSAVerifier

  readonly code: 0x1305
}

export interface RSAVerifier extends Verifier<DID<'key'>, CODE> {
  readonly code: 0x1205
  readonly signatureCode: CODE
  readonly signatureAlgorithm: ALG
}

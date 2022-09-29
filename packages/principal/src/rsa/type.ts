import { Signer, Verifier, Principal, UCAN, Await } from '@ucanto/interface'

export * from '@ucanto/interface'

export interface RSAPrincipal<M extends string = 'key'> extends Principal<M> {
  readonly signatureCode: 0xd01205
  readonly signatureAlgorithm: 'RS256'
}

export interface RSASigner<M extends string = 'key'>
  extends Principal<M>,
    Signer<M, RSAPrincipal['signatureCode']>,
    UCAN.Verifier<M, RSAPrincipal['signatureCode']> {
  readonly signer: RSASigner<M>
  readonly verifier: RSAVerifier<M>

  key: CryptoKey | null

  toCryptoKey: () => Await<CryptoKey>
}

export interface RSAVerifier<M extends string = 'key'>
  extends Principal<M>,
    Verifier<M, RSAPrincipal['signatureCode']> {
  key: CryptoKey | null
  toCryptoKey: () => Await<CryptoKey>
}

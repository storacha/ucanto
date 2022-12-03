import { VerifierKey, SignerKey, MulticodecCode } from '@ucanto/interface'

export * from '@ucanto/interface'

/**
 * Integer corresponding to RS256 byteprefix of the VarSig.
 */
export type SigAlg = MulticodecCode<0xd01205, 'RS256'>

/**
 * Name corresponding to RS256 algorithm.
 */
export type Name = 'RS256'

/**
 * This interface parametrizes {@link SignerKey} and extends it with RSA specific
 * details.
 */
export interface RSASigner extends SignerKey<SigAlg> {
  readonly signer: RSASigner
  readonly verifier: RSAVerifier

  /**
   * Multicodec code that corresponds to Ed private key.
   */
  readonly code: MulticodecCode<0x1305, 'RSAPrivateKey'>
}

/**
 * This interface parametrizes {@link VerifierKey} and extends it with Ed
 * specific details.
 */
export interface RSAVerifier extends VerifierKey<SigAlg> {
  /**
   * Multicodec code that corresponds to RSA public key.
   */
  readonly code: MulticodecCode<0x1205, 'RSAPublicKey'>
  readonly signatureCode: SigAlg
  readonly signatureAlgorithm: Name
}

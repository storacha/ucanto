import {
  SignerKey,
  VerifierKey,
  MulticodecCode,
  ByteView,
  DIDKey,
} from '@ucanto/interface'
import * as Signature from '@ipld/dag-ucan/signature'

export * from '@ucanto/interface'

/**
 * Integer corresponding to ES256 byteprefix of the VarSig.
 */
export type SigAlg = MulticodecCode<typeof Signature.ES256, 'ES256'>

/**
 * Name corresponding to ES256 algorithm.
 */
export type Name = 'ES256'

/**
 * This interface parametrizes {@link SignerKey} and extends it with P-256 specific
 * details.
 */
export interface P256Signer extends SignerKey<SigAlg> {
  readonly signatureAlgorithm: Name
  /**
   * Multicodec code that corresponds to P-256 private key.
   */
  readonly code: MulticodecCode<0x1301, 'p256-private-key'>

  readonly signer: P256Signer
  readonly verifier: P256Verifier

  /**
   * Encodes keypair into bytes.
   */
  encode(): ByteView<P256Signer & CryptoKeyPair>

  /**
   * Overrides method to make it more concrete allowing one to use `keys`
   * without checking if it's a `CryptoKey` or bytes.
   */
  toArchive(): {
    id: DIDKey
    keys: { [Key: DIDKey]: ByteView<SignerKey<SigAlg> & CryptoKey> }
  }
}

/**
 * This interface parametrizes {@link VerifierKey} and extends it with P-256
 * specific details.
 */
export interface P256Verifier extends VerifierKey<SigAlg> {
  /**
   * Multicodec code that corresponds to P-256 public key.
   */
  readonly code: MulticodecCode<0x1200, 'p256-public-key'>
  readonly signatureCode: SigAlg
  readonly signatureAlgorithm: Name
}
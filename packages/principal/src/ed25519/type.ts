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
 * Integer corresponding to EdDSA byteprefix of the VarSig.
 */
export type SigAlg = MulticodecCode<typeof Signature.EdDSA, 'EdDSA'>

/**
 * Name corresponding to EdDSA algorithm.
 */
export type Name = 'EdDSA'

/**
 * This interface parametrizes {@link SignerKey} and extends it with Ed specific
 * details.
 */
export interface EdSigner extends SignerKey<SigAlg> {
  readonly signatureAlgorithm: Name
  /**
   * Multicodec code that corresponds to Ed private key.
   */
  readonly code: MulticodecCode<0x1300, 'ed25519-private-key'>

  readonly signer: EdSigner
  readonly verifier: EdVerifier

  /**
   * Encodes keypair into bytes.
   */
  encode(): ByteView<EdSigner & CryptoKeyPair>

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
 * This interface parametrizes {@link VerifierKey} and extends it with Ed
 * specific details.
 */
export interface EdVerifier extends VerifierKey<SigAlg> {
  /**
   * Multicodec code that corresponds to Ed public key.
   */
  readonly code: MulticodecCode<0xed, 'ed25519-public-key'>
  readonly signatureCode: SigAlg
  readonly signatureAlgorithm: Name
}

import {
  SignerKey,
  VerifierKey,
  MulticodecCode,
  ByteView,
  DIDKey,
  SignatureView,
  Await,
} from '@ucanto/interface'
import * as Signature from '@ipld/dag-ucan/signature'

export * from '@ucanto/interface'

/**
 * Integer corresponding to BLS12381G2 byteprefix of the VarSig.
 */
export type SigAlg = MulticodecCode<typeof Signature.BLS12381G2, 'BLS12381G2'>

/**
 * Name corresponding to BLS12381G2 algorithm.
 */
export type Name = 'BLS12381G2'

/**
 * This interface parametrizes {@link SignerKey} and extends it with BLS specific
 * details.
 */
export interface BLSSigner extends SignerKey<SigAlg> {
  readonly signatureAlgorithm: Name
  readonly signatureCode: SigAlg
  /**
   * Multicodec code that corresponds to BLS private key.
   */
  readonly code: MulticodecCode<0x1309, 'bls12-381-private-key'>

  readonly signer: BLSSigner
  readonly verifier: BLSVerifier

  readonly secret: Uint8Array

  /**
   * Encodes keypair into bytes.
   */
  encode(): ByteView<BLSSigner & CryptoKeyPair>

  /**
   * Overrides method to make it more concrete allowing one to use `keys`
   * without checking if it's a `CryptoKey` or bytes.
   */
  toArchive(): {
    id: DIDKey
    keys: { [Key: DIDKey]: ByteView<SignerKey<SigAlg> & CryptoKey> }
  }

  toFilecoinWallet(): string

  sign<T>(payload: ByteView<T>): Await<BLSSignature<T>>
}

export interface BLSSignature<T = unknown> extends SignatureView<T, SigAlg> {}

/**
 * This interface parametrizes {@link VerifierKey} and extends it with BLS
 * specific details.
 */
export interface BLSVerifier extends VerifierKey<SigAlg> {
  /**
   * Multicodec code that corresponds to BLS public key.
   */
  readonly code: MulticodecCode<0xeb, 'BLS12-381'>
  readonly signatureCode: SigAlg
  readonly signatureAlgorithm: Name

  publicKey: Uint8Array
  toFilecoinAddress(network?: 't' | 'f'): string
}

import {
  Signer,
  Verifier,
  SignerImporter,
  PrincipalParser,
  DID,
  Await,
} from '@ucanto/interface'
export * from '@ucanto/interface'

export interface SigningPrincipalGenerator<Code extends number> {
  generate(): Await<Signer<DID<'key'>, Code>>
}

export interface VerifierOptions<M extends string = string> {
  resolve(did: DID<M>): Await<DID<'key'>>
  parser: PrincipalParser
}

export interface SignerOptions {
  importer: SignerImporter
  parser: PrincipalParser
}

export type { Signer, Verifier }

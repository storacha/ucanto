import * as API from '@ucanto/interface'

/**
 * @param {API.DID} did
 * @param {API.PrincipalParser[]} parsers
 * @return {API.Verifier}
 */
const parseWith = (did, parsers) => {
  if (did.startsWith('did:')) {
    for (const parser of parsers) {
      try {
        return parser.parse(did)
      } catch (_) {}
    }
    throw new Error(`Unsupported did ${did}`)
  } else {
    throw new Error(`Expected did instead got ${did}`)
  }
}

/**
 * @param {API.PrincipalParser} left
 * @param {API.PrincipalParser} right
 * @returns {API.ComposedDIDParser}
 */
export const or = (left, right) => new Parser([left, right])

/**
 * @implements {API.ComposedDIDParser}
 */
class Parser {
  /**
   * @param {API.PrincipalParser[]} variants
   */
  constructor(variants) {
    this.variants = variants
  }

  /**
   * @param {API.DID} did
   */
  parse(did) {
    return parseWith(did, this.variants)
  }

  /**
   * @param {API.PrincipalParser} parser
   */
  or(parser) {
    return new Parser([...this.variants, parser])
  }
}

/**
 * @template {API.DID} ID
 * @template {API.MulticodecCode} SigAlg
 * @param {API.VerifierKey<SigAlg>} key
 * @param {ID} id
 * @returns {API.Verifier<ID, SigAlg>}
 */
export const withDID = (key, id) => new VerifierWithDID(id, key)

/**
 * @template {API.DID} ID
 * @template {API.MulticodecCode} SigAlg
 * @implements {API.Verifier<ID, SigAlg>}
 */
class VerifierWithDID {
  /**
   * @param {ID} id
   * @param {API.VerifierKey<SigAlg>} key
   */
  constructor(id, key) {
    this.id = id
    this.key = key
  }
  did() {
    return this.id
  }

  toDIDKey() {
    return this.key.toDIDKey()
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, SigAlg>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    return this.key.verify(payload, signature)
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   */
  withDID(id) {
    return withDID(this.key, id)
  }
}

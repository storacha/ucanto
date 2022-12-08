import * as API from '@ucanto/interface'

/**
 *
 * @param {API.DID} did
 */
const notFound = did => {
  throw new RangeError(`Unable to resolve ${did}`)
}

/**
 * @param {API.DID} did
 * @param {API.PrincipalParser[]} parsers
 * @return {API.Verifier}
 */
const parseWith = (did, parsers) => {
  for (const parser of parsers) {
    try {
      return parser.parse(did)
    } catch (_) {}
  }
  throw new Error(`Unsupported did ${did}`)
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
   * @param {API.DIDResolver} options
   */
  parse(did, options = {}) {
    if (did.startsWith('did:key:')) {
      return parseWith(did, this.variants)
    } else if (did.startsWith('did:')) {
      return new Verifier(did, null, this.variants, options)
    } else {
      throw new Error(`Expected did instead got ${did}`)
    }
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

/**
 * Implementation of `Verifier` that lazily resolves it's DID to corresponding
 * did:key verifier. For more details on methods and type parameters please see
 * `Verifier` interface.
 *
 * @template {API.DID} ID
 * @template {API.SigAlg} Alg
 * @implements {API.Verifier<ID, Alg>}
 */
class Verifier {
  /**
   * @param {ID} id
   * @param {API.VerifierKey<Alg>|null} key
   * @param {API.PrincipalParser[]} parsers
   * @param {API.DIDResolver} options
   */
  constructor(id, key, parsers, { resolveDID = notFound }) {
    this.id = id
    this.parsers = parsers
    this.options = { resolveDID }
    this.key = key
  }

  did() {
    return this.id
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   */
  withDID(id) {
    return new Verifier(id, this.key, this.parsers, this.options)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Alg>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    if (this.key) {
      return this.key.verify(payload, signature)
    } else {
      return this.resolveAndVerify(payload, signature)
    }
  }

  /**
   * @private
   */
  async resolve() {
    // Please note that this is not meant to perform live DID document
    // resolution nor instance is supposed to be reused across UCAN validation
    // sessions. Key is only ever resolved once to make this verifier
    // referentially transparent.
    if (!this.key) {
      const result = await this.options.resolveDID(this.id)
      if (result.error) {
        throw result
      }

      this.key = /** @type {API.Verifier<API.DID<'key'>, Alg>} */ (
        parseWith(result, this.parsers)
      )
    }
    return this.key
  }

  /**
   * @private
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Alg>} signature
   * @returns {Promise<boolean>}
   */
  async resolveAndVerify(payload, signature) {
    try {
      const key = await this.resolve()
      return key.verify(payload, signature)
    } catch (_) {
      // It may swallow resolution error which is not ideal, but throwing
      // is not really a good solution here instead we should change return
      // type to result from boolean as per issue
      // @see https://github.com/web3-storage/ucanto/issues/150
      return false
    }
  }
}

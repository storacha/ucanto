import * as API from '@ucanto/interface'
import * as Key from './key.js'

/**
 * Takes `SignerArchive` and restores it into a `Signer` that can be used
 * for signing & verifying payloads.
 *
 * @template {API.DID} ID - DID that can be imported, which may be a type union.
 * @template {API.SigAlg} Alg - Multicodec code corresponding to signature algorithm.
 * @param {API.SignerArchive<ID, Alg>} archive
 * @param {API.SignerImporter} importer
 * @returns {API.Signer<ID, Alg>}
 */
export const from = (archive, importer = Key.Signer) => {
  if (archive.id.startsWith('did:key:')) {
    return /** @type {API.Signer<ID, Alg>} */ (importer.from(archive))
  } else {
    for (const [name, key] of Object.entries(archive.keys)) {
      const id = /** @type {API.DID<'key'>} */ (name)
      const signer = /** @type {API.Signer<API.DID<'key'>, Alg>} */ (
        importer.from({
          id,
          keys: { [id]: key },
        })
      )

      return signer.withDID(archive.id)
    }

    throw new Error(`Archive ${archive.id} constaints no keys`)
  }
}

/**
 *
 * @param {API.DID} did
 */
const notFound = did => {
  throw new RangeError(`Unable to reslove ${did}`)
}

/**
 * @param {API.DID} did
 * @param {Partial<VerifierOptions>} options
 * @returns {API.Verifier}
 */
export const parse = (
  did,
  { parser = Key.Verifier, resolve = notFound } = {}
) => {
  if (did.startsWith('did:key:')) {
    return parser.parse(did)
  } else if (did.startsWith('did:')) {
    return new Verifier(did, null, {
      parser,
      resolve,
    })
  } else {
    throw new Error(`Expected did instead got ${did}`)
  }
}

/**
 * @typedef {{
 * parser: API.PrincipalParser
 * resolve: (did:API.DID) => API.Await<API.DID<'key'>>
 * }} VerifierOptions
 */

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
   * @param {VerifierOptions} options
   */
  constructor(id, key, options) {
    this.id = id
    this.options = options
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
    return new Verifier(id, this.key, this.options)
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
      const did = await this.options.resolve(this.id)
      this.key = /** @type {API.Verifier<API.DID<'key'>, Alg>} */ (
        this.options.parser.parse(did)
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

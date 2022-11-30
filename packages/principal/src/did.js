import * as API from '@ucanto/interface'
import * as Key from './key.js'

/**
 * @template {API.DID} ID
 * @template {number} Code
 * @param {API.SignerArchive<ID, Code>} archive
 * @param {API.SignerImporter} importer
 * @returns {API.Signer<ID, Code>}
 */
export const from = (archive, importer = Key.Signer) => {
  if (archive.id.startsWith('did:key:')) {
    return /** @type {API.Signer<ID, Code>} */ (importer.from(archive))
  } else {
    for (const [name, key] of Object.entries(archive.keys)) {
      const id = /** @type {API.DID<'key'>} */ (name)
      const signer = /** @type {API.Signer<API.DID<'key'>, Code>} */ (
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
 * @template {API.DID} ID
 * @template {number} Code
 * @implements {API.Verifier<ID, Code>}
 */
class Verifier {
  /**
   * @param {ID} id
   * @param {API.Verifier<API.DID<"key">, Code>|null} key
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
   * @param {API.Signature<T, Code>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    if (this.key) {
      return this.key.verify(payload, signature)
    } else {
      return this.resolveAndVerify(payload, signature)
    }
  }

  async resolve() {
    if (!this.key) {
      const did = await this.options.resolve(this.id)
      this.key = /** @type {API.Verifier<API.DID<'key'>, Code>} */ (
        this.options.parser.parse(did)
      )
    }
    return this.key
  }

  /**
   * @private
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Code>} signature
   * @returns {Promise<boolean>}
   */
  async resolveAndVerify(payload, signature) {
    try {
      const key = await this.resolve()
      return key.verify(payload, signature)
    } catch (_) {
      return false
    }
  }
}

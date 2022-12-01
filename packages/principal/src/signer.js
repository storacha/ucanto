import * as API from '@ucanto/interface'

/**
 * @template {[API.SignerImporter, ...API.SignerImporter[]]} Importers
 * @param {Importers} importers
 */
export const create = importers => {
  const from = /** @type {API.Intersection<Importers[number]['from']>} */ (
    /**
     * @param {API.SignerArchive} archive
     * @returns {API.Signer}
     */
    archive => {
      for (const importer of importers) {
        try {
          return importer.from(archive)
        } catch (_) {}
      }
      throw new Error(`Unsupported signer`)
    }
  )

  return { create, from }
}

/**
 * @template {number} Code
 * @template {API.DID} ID
 * @param {API.Signer<API.DID<'key'>, Code>} signer
 * @param {ID} id
 * @returns {API.Signer<ID, Code>}
 */
export const withDID = ({ signer, verifier }, id) =>
  new Signer(signer, verifier.withDID(id))

/**
 * @template {API.DID} ID
 * @template {number} Code
 * @implements {API.Signer<ID, Code>}
 */
class Signer {
  /**
   * @param {API.Signer<API.DID<'key'>, Code>} key
   * @param {API.Verifier<ID, Code>} verifier
   */
  constructor(key, verifier) {
    this.key = key
    this.verifier = verifier
  }
  /** @type {API.Signer<ID, Code>} */
  get signer() {
    return this
  }

  get signatureAlgorithm() {
    return this.key.signatureAlgorithm
  }
  get signatureCode() {
    return this.key.signatureCode
  }

  /**
   * @returns {ID}
   */
  did() {
    return this.verifier.did()
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   */
  withDID(id) {
    return withDID(this.key, id)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   */
  sign(payload) {
    return this.key.sign(payload)
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Code>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  toArchive() {
    const { keys } = this.key.toArchive()
    return {
      id: this.did(),
      keys,
    }
  }
}

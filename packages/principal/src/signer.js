import * as API from '@ucanto/interface'

/**
 * @template {API.SignerImporter} L
 * @template {API.SignerImporter} R
 * @param {L} left
 * @param {R} right
 * @returns {API.CompositeImporter<[L, R]>}
 */
export const or = (left, right) => new Importer([left, right])

/**
 * @template {[API.SignerImporter, ...API.SignerImporter[]]} Importers
 * @implements {API.CompositeImporter<Importers>}
 */
class Importer {
  /**
   * @param {Importers} variants
   */
  constructor(variants) {
    this.variants = variants
    this.from = create(variants)
  }

  /**
   * @template {API.SignerImporter} Other
   * @param {Other} other
   * @returns {API.CompositeImporter<[Other, ...Importers]>}
   */
  or(other) {
    return new Importer([other, ...this.variants])
  }
}

/**
 * @template {[API.SignerImporter, ...API.SignerImporter[]]} Importers
 * @param {Importers} importers
 */
const create = importers => {
  /**
   * @template {API.DID} ID - DID that can be imported, which may be a type union.
   * @template {API.SigAlg} Alg - Multicodec code corresponding to signature algorithm.
   * @param {API.SignerArchive<ID, Alg>} archive
   * @returns {API.Signer<ID, Alg>}
   */
  const from = archive => {
    if (archive.id.startsWith('did:key:')) {
      return /** @type {API.Signer<ID, Alg>} */ (importWith(archive, importers))
    } else {
      for (const [name, key] of Object.entries(archive.keys)) {
        const id = /** @type {API.DIDKey} */ (name)
        const signer = /** @type {API.Signer<API.DIDKey, Alg>} */ (
          importWith(
            {
              id,
              keys: { [id]: key },
            },
            importers
          )
        )

        return signer.withDID(archive.id)
      }

      throw new Error(`Archive ${archive.id} contains no keys`)
    }
  }

  return /** @type {API.Intersection<Importers[number]['from']>} */ (from)
}

/**
 * @param {API.SignerArchive} archive
 * @param {API.SignerImporter[]} importers
 * @returns {API.Signer}
 */
const importWith = (archive, importers) => {
  for (const importer of importers) {
    try {
      return importer.from(archive)
    } catch (_) {}
  }
  throw new Error(`Unsupported signer`)
}
/**
 * @template {number} Code
 * @template {API.DID} ID
 * @param {API.Signer<API.DID<'key'>, Code>} signer
 * @param {ID} id
 * @returns {API.Signer<ID, Code>}
 */
export const withDID = ({ signer, verifier }, id) =>
  new SignerWithDID(signer, verifier.withDID(id))

/**
 * @template {API.DID} ID
 * @template {number} Code
 * @implements {API.Signer<ID, Code>}
 */
class SignerWithDID {
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

  toDIDKey() {
    return this.verifier.toDIDKey()
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

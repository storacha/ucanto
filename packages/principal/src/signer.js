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

import * as API from './type.js'
import * as Key from '../key.js'

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

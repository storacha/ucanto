import * as API from '@ucanto/interface'

/**
 * @param {API.PrincipalParser[]} options
 */
export const create = options => ({
  create,
  /**
   * @param {API.DID} did
   * @return {API.Verifier}
   */
  parse: did => {
    for (const option of options) {
      try {
        return option.parse(did)
      } catch (_) {}
    }
    throw new Error(`Unsupported did ${did}`)
  },
})

/**
 * @template {API.DID} ID
 * @template {API.MulticodecCode} SigAlg
 * @param {API.VerifierKey<SigAlg>} key
 * @param {ID} id
 * @returns {API.Verifier<ID, SigAlg>}
 */
export const withDID = (key, id) => new Verifier(id, key)

/**
 * @template {API.DID} ID
 * @template {API.MulticodecCode} SigAlg
 * @implements {API.Verifier<ID, SigAlg>}
 */
class Verifier {
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

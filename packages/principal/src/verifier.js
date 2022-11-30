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
 * @template {number} Code
 * @param {API.Verifier<API.DID<"key">, Code>} key
 * @param {ID} id
 * @returns {API.Verifier<ID, Code>}
 */
export const withDID = (key, id) => new Verifier(id, key)

/**
 * @template {API.DID} ID
 * @template {number} Code
 * @implements {API.Verifier<ID, Code>}
 */
class Verifier {
  /**
   * @param {ID} id
   * @param {API.Verifier<API.DID<"key">, Code>} key
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
   * @param {API.Signature<T, Code>} signature
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

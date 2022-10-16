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
    throw new Error(`Unsupported principal with DID ${did}`)
  },
})

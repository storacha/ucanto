import * as API from '@ucanto/interface'

/**
 * @template {API.DID} ID
 * @param {{
 * signer: API.Signer<ID>
 * authority?: API.Principal
 * proofs?: API.Delegation[]
 * }} options
 */
export const create = ({ signer, authority = signer, proofs = [] }) =>
  new Agent({ signer, authority, proofs, context: {} })

/**
 * @template {API.DID} ID
 * @template {{}} Context
 */
class Agent {
  /**
   * @param {object} options
   * @param {API.Signer<ID>} options.signer
   * @param {API.Principal} options.authority
   * @param {API.Delegation[]} options.proofs
   * @param {Context} options.context
   */
  constructor(options) {
    this.options = options
  }
  get context() {
    return this.options.context
  }

  did() {
    return this.options.signer.did()
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   */

  sign(payload) {
    return this.options.signer.sign(payload)
  }
  /**
   * @template {{}} Extra
   * @param {Extra} extra
   * @returns {Agent<ID, Context & Extra>}
   */
  with(extra) {
    return new Agent({
      ...this.options,
      context: { ...this.options.context, ...extra },
    })
  }
}

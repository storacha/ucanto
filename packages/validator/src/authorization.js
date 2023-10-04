import * as API from '@ucanto/interface'

/**
 * @template {API.ParsedCapability} C
 * @implements {API.Authorization<C>}
 */
class Authorization {
  /**
   * @param {API.Match<C>} match
   * @param {API.Authorization<API.ParsedCapability>[]} proofs
   */
  constructor(match, proofs) {
    this.match = match
    this.proofs = proofs
  }
  get capability() {
    return this.match.value
  }
  get delegation() {
    return this.match.source[0].delegation
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.delegation.audience
  }
}

/**
 * @template {API.ParsedCapability} C
 * @param {API.Match<C>} match
 * @param {API.Authorization<API.ParsedCapability>[]} proofs
 * @returns {API.Authorization<C>}
 */
export const create = (match, proofs = []) => new Authorization(match, proofs)

/**
 *
 * @param {API.Authorization} authorization
 * @returns {Iterable<API.UCANLink>}
 */
export const iterate = function* ({ delegation, proofs }) {
  yield delegation.cid
  for (const proof of proofs) {
    yield* iterate(proof)
  }
}

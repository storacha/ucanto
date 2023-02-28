import * as Signature from '@ipld/dag-ucan/signature'
import * as UCAN from '@ipld/dag-ucan'

/**
 * @template {UCAN.DID} ID
 * @param {{id: ID }} id
 * @returns {UCAN.Signer<ID, Signature.NON_STANDARD>}
 */
export const from = ({ id }) => new Absentee(id)

/**
 * An absentee is a special type of signer that produces an absent signature,
 * which signals that verifier needs to verify authorization interactively.
 *
 * @template {UCAN.DID} ID
 * @implements {UCAN.Signer<ID, Signature.NON_STANDARD>}
 */
class Absentee {
  /**
   * @param {ID} id
   */
  constructor(id) {
    this.id = id
  }
  did() {
    return this.id
  }
  /* c8 ignore next 3 */
  get signatureCode() {
    return Signature.NON_STANDARD
  }
  get signatureAlgorithm() {
    return ''
  }
  sign() {
    return Signature.createNonStandard(
      this.signatureAlgorithm,
      new Uint8Array(0)
    )
  }
}

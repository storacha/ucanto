import * as UCAN from "@ipld/dag-ucan"
import * as API from "../src/api.js"

/**
 * @typedef {{
 * can: "store/add"
 * with: UCAN.DID
 * link: UCAN.Link
 * }} Add
 *
 * @typedef {{
 * status: "done"
 * with: UCAN.DID
 * link: UCAN.Link
 * }} Added
 *
 * @typedef {{
 * status: "upload"
 * with: UCAN.DID
 * link: UCAN.Link
 * url: string
 * }} Upload
 *
 * @typedef {{
 * can: "store/remove"
 * with: UCAN.DID
 * link: UCAN.Link
 * }} Remove
 */
const service = {
  store: {
    /**
     * @param {API.Instruction<Add>} ucan
     * @returns {Promise<API.Result<Added|Upload, string>>}
     */
    async add(ucan) {
      const [action] = ucan.capabilities
      if (action.with === ucan.issuer) {
        // can do it
      } else {
      }
      return {
        ok: true,
        value: {
          with: action.with,
          link: action.link,
          status: "upload",
          url: "http://localhost:9090/",
        },
      }
    },
    /**
     * @param {API.Instruction<Remove>} ucan
     * @returns {Promise<API.Result<Remove, string>>}
     */
    async remove(ucan) {
      const [action] = ucan.capabilities
      return {
        ok: true,
        value: action,
      }
    },
  },
}


class CarSetProvider {
  /**
   * Service will call this once it verified the UCAN to associate link with a
   * given DID. Service is unaware if given `DID` is associated with some account
   * or not, if it is not `StoreProvider` MUST return `UnauthorizedDIDError`.
   */
  add(
    group: DID,
    link: Link,
    proof: Proof
  ): Result<AddStatus, UnauthorizedDIDError | QuotaViolationError>
  remove(
    group: DID,
    link: Link,
    ucan: Proof
  ): Result<undefined, UnauthorizedDIDError | DoesNotHasError>
}

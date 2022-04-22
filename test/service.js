import * as UCAN from "@ipld/dag-ucan"
import * as API from "./api.js"
import * as Auth from "../src/claim/access.js"

import { ok, the } from "./services/util.js"

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

/**
 * @typedef {{
 * store: API.StorageProvider
 * }} Model
 */

class StorageService {
  /**
   * @param {Model} config
   */
  constructor(config) {
    this.store = config.store
  }
  /**
   * @param {API.Invocation<Add>} ucan
   * @returns {Promise<API.Result<Added|Upload, API.UnknownDIDError|API.QuotaViolationError>|Auth.InvalidClaim>}
   */
  async add(ucan) {
    const { capability } = ucan
    const auth = await Auth.access(capability, /** @type {any} */ (ucan))
    if (auth.ok) {
      const result = await this.store.add(
        capability.with,
        capability.link,
        /** @type {any} */ (ucan)
      )
      if (result.ok) {
        if (result.value.status === "in-s3") {
          return ok({
            ...capability,
            status: the("done"),
          })
        } else {
          return ok({
            ...capability,
            status: the("upload"),
            url: "http://localhost:9090/",
          })
        }
      } else {
        return result
      }
    } else {
      return auth
    }
  }
  /**
   * @param {API.Invocation<Remove>} ucan
   * @returns {Promise<API.Result<Remove, API.UnknownDIDError|API.DoesNotHasError|Auth.InvalidClaim>>}
   */
  async remove(ucan) {
    const { capability } = ucan
    const access = await Auth.access(capability, /** @type {any} */ (ucan))
    if (access.ok) {
      const remove = await this.store.remove(
        capability.with,
        capability.link,
        /** @type {any} */ (capability)
      )
      if (remove.ok) {
        return ok(capability)
      } else {
        return remove
      }
    } else {
      return access
    }
  }
}

class Main {
  /**
   * @param {Model} config
   */
  constructor(config) {
    this.storage = new StorageService(config)
  }
}

/**
 * @typedef {Main} Service
 * @param {Model} config
 * @returns {Service}
 */
export const create = config => new Main(config)
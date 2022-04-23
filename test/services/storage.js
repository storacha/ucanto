import * as API from "../api.js"
import { UnknownDIDError, create as Accounts } from "./account.js"
import { the, ok, unreachable } from "../../src/util.js"

/**
 * @param {Partial<Model> & { accounts: API.AccessProvider }} config
 * @returns {API.StorageProvider}
 */
export const create = config => new StoreProvider(config)

/**
 * @typedef {{
 * accounts: API.AccessProvider
 * groups: Map<API.DID, Map<string, API.Link>>
 * cars: Map<string, API.Link>
 * }} Model
 *
 * @implements {API.StorageProvider}
 */
class StoreProvider {
  /**
   * @param {Partial<Model>} model
   */
  constructor({ accounts = Accounts(), groups = new Map(), cars = new Map() }) {
    this.accounts = accounts
    this.groups = groups
    this.cars = cars

    this.add = add.bind(null, this)
    this.remove = remove.bind(null, this)
  }
}

/**
 * @param {Model} self
 * @param {API.DID} group
 * @param {API.Link} link
 * @param {API.Link} proof
 */
export const add = async ({ accounts, groups, cars }, group, link, proof) => {
  const account = await accounts.resolve(group)
  if (account) {
    const links = groups.get(group) || new Map()
    links.set(`${link}`, link)
    groups.set(group, links)
    return ok({ status: cars.get(`${link}`) ? the("in-s3") : the("not-in-s3") })
  } else {
    return new UnknownDIDError(`DID ${group} has no account`, group)
  }
}

/**
 * @param {Model} self
 * @param {API.DID} group
 * @param {API.Link} link
 * @param {API.Link} proof
 */
export const remove = async ({ accounts, groups }, group, link, proof) => {
  const account = await accounts.resolve(group)
  if (account) {
    const links = groups.get(group)
    return links && links.get(`${link}`)
      ? ok()
      : new DoesNotHasError(group, link)
  } else {
    return new UnknownDIDError(`DID ${group} has no account`, group)
  }
}

class DoesNotHasError extends RangeError {
  /**
   *
   * @param {API.DID} group
   * @param {API.Link} link
   */
  constructor(group, link) {
    super()
    this.name = the("DoesNotHasError")
    this.group = group
    this.link = link
  }
}

import * as API from "../api.js"
import { UnknownDIDError, create as Accounts } from "./access.js"
import { the, ok, unreachable } from "./util.js"

/**
 * @param {Model & { accounts: API.AccessProvider }} config
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
export const add = async ({ accounts, cars }, group, link, proof) => {
  const account = await accounts.resolve(group)
  const result = account
    ? ok({ status: cars.get(`${link}`) ? the("in-s3") : the("not-in-s3") })
    : new UnknownDIDError(`DID ${group} has no account`)

  return result
}

/**
 * @param {Model} self
 * @param {API.DID} group
 * @param {API.Link} link
 * @param {API.Link} proof
 */
export const remove = async ({ accounts, cars }, group, link, proof) => {
  const account = await accounts.resolve(group)
  if (account) {
    return cars.get(`${link}`) ? ok() : new DoesNotHasError(group, link)
  } else {
    return new UnknownDIDError(`DID ${group} has no account`)
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

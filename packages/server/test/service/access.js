import * as Server from '../../src/server.js'
import { provide } from '../../src/handler.js'
import * as API from './api.js'
import { service as w3 } from '../fixtures.js'
export const id = w3

const registerCapability = Server.capability({
  can: 'identity/register',
  with: Server.Schema.URI.match({ protocol: 'mailto:' }),
  derives: (claimed, delegated) =>
    claimed.with === delegated.with ||
    new Server.Failure(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    ),
})

const linkCapability = Server.capability({
  can: 'identity/link',
  with: Server.Schema.URI,
  derives: (claimed, delegated) =>
    claimed.with === delegated.with ||
    new Server.Failure(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    ),
})

const identifyCapability = Server.capability({
  can: 'identity/identify',
  with: Server.Schema.URI,
  derives: (claimed, delegated) =>
    claimed.with === delegated.with ||
    delegated.with === 'ucan:*' ||
    new Server.Failure(`Can not derive ${claimed.with} from ${claimed.with}`),
})

/**
 * @typedef {Map<API.DID|API.URI<"mailto:">, {account:API.DID, proof:API.Link}>} Model
 * @type {Model}
 */
const state = new Map()

export const register = provide(
  registerCapability,
  async ({ capability, invocation }) => {
    return associate(
      state,
      invocation.issuer.did(),
      capability.with,
      invocation.cid,
      true
    )
  }
)

export const link = provide(
  linkCapability,
  async ({ capability, invocation }) => {
    return associate(
      state,
      invocation.issuer.did(),
      /** @type {API.DID} */ (capability.with),
      invocation.cid,
      false
    )
  }
)

export const identify = provide(
  identifyCapability,
  async function identify({ capability }) {
    const did = /** @type {API.DID} */ (capability.with)
    const account = resolve(state, did)
    return account == null ? new UnknownIDError(did) : account
  }
)

/**
 * @param {Model} accounts
 * @param {API.DID} from
 * @param {API.DID|API.URI<"mailto:">} to
 * @param {API.Link} proof
 * @param {boolean} create
 * @returns {API.SyncResult<null, API.UnknownIDError>}
 */
const associate = (accounts, from, to, proof, create) => {
  const fromAccount = resolve(accounts, from)
  const toAccount = resolve(accounts, to)
  // So it could be that no did is linked with an account, one of the dids is
  // linked with an account or both dids are linked with accounts. If no did
  // is linked we just create a new account and link both did's with it. If
  // one of the dids is linked with the account we link other with the same
  // account if both are linked to a differnt accounts we create new joint
  // account and link all them together.
  if (!fromAccount && !toAccount) {
    if (create) {
      const account = /** @type {API.DID} */ (`did:ipld:${proof}`)
      accounts.set(to, { account, proof })
      accounts.set(from, { account, proof })
    } else {
      return new UnknownIDError('Unknown did', to)
    }
  } else if (toAccount) {
    accounts.set(from, { account: toAccount, proof })
  } else if (fromAccount) {
    accounts.set(to, { account: fromAccount, proof })
  } else if (fromAccount !== toAccount) {
    const account = /** @type {API.DID} */ (`did:ipld:${proof}`)
    accounts.set(toAccount, { account, proof })
    accounts.set(fromAccount, { account, proof })
  }

  return null
}

/**
 * Resolves memeber account. If member is not linked with any account returns
 * `null` otherwise returns DID of the account which will have a
 * `did:ipld:bafy...hash` form.
 *
 * @param {Model} accounts
 * @param {API.DID|API.URI<"mailto:">} member
 * @returns {API.DID|null}
 */
const resolve = (accounts, member) => {
  let group = accounts.get(member)
  while (group) {
    const parent = accounts.get(group.account)
    if (parent) {
      group = parent
    } else {
      return group.account
    }
  }
  return null
}

/**
 * @implements {API.UnknownIDError}
 */
export class UnknownIDError extends RangeError {
  /**
   * @param {string} message
   * @param {API.DID|API.DID|API.URI<"mailto:">|null} [id]
   */
  constructor(message, id = null) {
    super(message)
    this.id = id
  }
  get error() {
    return /** @type {true} */ (true)
  }
  /** @type {"UnknownIDError"} */
  get name() {
    return 'UnknownIDError'
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      id: this.id,
      error: true,
    }
  }
}

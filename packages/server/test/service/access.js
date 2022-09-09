import * as Server from '../../src/server.js'
import { provide } from '../../src/handler.js'
import * as API from './api.js'
import { Principal, Agent } from '@ucanto/authority'
import { service as w3 } from '../fixtures.js'
export const id = w3

const registerCapability = Server.capability({
  can: 'identity/register',
  with: Server.URI.match({ protocol: 'mailto:' }),
  derives: (claimed, delegated) =>
    claimed.uri.href === delegated.uri.href ||
    new Server.Failure(
      `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
    ),
})

const linkCapability = Server.capability({
  can: 'identity/link',
  with: Server.URI,
  derives: (claimed, delegated) =>
    claimed.uri.href === delegated.uri.href ||
    new Server.Failure(
      `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
    ),
})

const identifyCapability = Server.capability({
  can: 'identity/identify',
  with: Server.URI,
  derives: (claimed, delegated) =>
    claimed.uri.href === delegated.uri.href ||
    delegated.uri.href === 'ucan:*' ||
    new Server.Failure(
      `Can not derive ${claimed.uri.href} from ${claimed.uri.href}`
    ),
})

/**
 * @typedef {Map<API.DID, {account:API.DID, proof:API.Link}>} Model
 * @type {Model}
 */
const state = new Map()

export const register = provide(
  registerCapability,
  async ({ capability, invocation }) => {
    return associate(
      state,
      invocation.issuer.did(),
      /** @type {API.DID} */ (capability.with),
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
    const did = /** @type {API.DID} */ (capability.uri.href)
    const account = resolve(state, did)
    return account == null ? new UnknownDIDError(did) : account
  }
)

/**
 * @param {Model} accounts
 * @param {API.DID} from
 * @param {API.DID} to
 * @param {API.Link} proof
 * @param {boolean} create
 * @returns {API.SyncResult<null, API.UnknownDIDError>}
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
      return new UnknownDIDError('Unknown did', to)
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
 * @param {API.DID} member
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
 * @implements {API.UnknownDIDError}
 */
export class UnknownDIDError extends RangeError {
  /**
   * @param {string} message
   * @param {API.DID|null} [did]
   */
  constructor(message, did = null) {
    super(message)
    this.did = did
  }
  get error() {
    return /** @type {true} */ (true)
  }
  /** @type {"UnknownDIDError"} */
  get name() {
    return 'UnknownDIDError'
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      did: this.did,
      error: true,
    }
  }
}

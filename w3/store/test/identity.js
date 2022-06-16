import * as Capability from "../src/identity/capability.js"
import * as Server from "@ucanto/server"
import * as API from "../src/type.js"

export * from "../src/identity/invoke.js"

/**
 * @template K
 * @template V
 * @typedef {{
 *   get(key:K):API.Await<V|undefined>
 *   has(key:K):API.Await<boolean>
 *   set(key:K, value:V):API.Await<object>
 *   delete(key:K):API.Await<boolean>
 * }} KVStore
 */

/**
 * @typedef {{account:API.DID, proof:Server.LinkedProof}} AccountLink
 * @typedef {KVStore<API.Identity.ID, AccountLink>} DB
 *
 * @param {{db: DB}} context
 * @return {API.Identity.Identity}
 */
export const service = ({ db }) => ({
  register: Server.provide(
    Capability.register,
    async ({ capability, invocation }) => {
      const result = await associate(
        db,
        invocation.issuer.did(),
        /** @type {API.Identity.MailtoID} */ (capability.with),
        invocation.cid,
        true
      )
      if (result) {
        return null
      } else {
        throw new Error(`registering account should never fail`)
      }
    }
  ),
  link: Server.provide(Capability.link, async ({ capability, invocation }) => {
    const id = /** @type {API.Identity.MailtoID} */ (capability.with)
    if (
      await associate(db, invocation.issuer.did(), id, invocation.cid, false)
    ) {
      return null
    } else {
      return new NotRegistered([invocation.issuer.did(), id])
    }
  }),
  identify: Server.provide(
    Capability.identify,
    async ({ capability, invocation }) => {
      const id = /** @type {API.Identity.ID} */ (capability.with)
      const account = await resolve(db, id)
      return account || new NotRegistered([id])
    }
  ),
})

/**
 * @param {API.ServerOptions & { context: { db: DB } }} options
 */
export const server = ({ context, ...options }) =>
  Server.create({
    ...options,
    service: { identity: service(context) },
  })

/**
 * @param {DB} db
 * @param {API.Identity.ID} from
 * @param {API.Identity.ID} to
 * @param {API.LinkedProof} proof
 * @param {boolean} create
 * @returns {Promise<boolean>}
 */
const associate = async (db, from, to, proof, create) => {
  const [fromAccount, toAccount] = await Promise.all([
    resolve(db, from),
    resolve(db, to),
  ])

  // So it could be that no did is linked with an account, one of the dids is
  // linked with an account or both dids are linked with accounts. If no did
  // is linked we just create a new account and link both did's with it. If
  // one of the dids is linked with the account we link other with the same
  // account if both are linked to a differnt accounts we create new joint
  // account and link all them together.
  if (!fromAccount && !toAccount) {
    if (create) {
      const account = /** @type {API.DID} */ (`did:ipld:${proof}`)
      await Promise.all([
        db.set(to, { account, proof }),
        db.set(from, { account, proof }),
      ])
    } else {
      return false
    }
  } else if (toAccount) {
    await db.set(from, { account: toAccount, proof })
  } else if (fromAccount) {
    await db.set(to, { account: fromAccount, proof })
  } else if (fromAccount !== toAccount) {
    const account = /** @type {API.DID} */ (`did:ipld:${proof}`)
    await Promise.all([
      db.set(toAccount, { account, proof }),
      db.set(fromAccount, { account, proof }),
    ])
  }

  return true
}

/**
 * Resolves memeber account. If member is not linked with any account returns
 * `null` otherwise returns DID of the account which will have a
 * `did:ipld:bafy...hash` form.
 *
 * @param {DB} db
 * @param {API.Identity.ID} member
 * @returns {Promise<API.DID|null>}
 */
const resolve = async (db, member) => {
  let group = await db.get(member)
  while (group) {
    const parent = await db.get(group.account)
    if (parent) {
      group = parent
    } else {
      return group.account
    }
  }
  return null
}

/**
 * @implements {API.Identity.NotRegistered}
 */
export class NotRegistered {
  /**
   * @param {[API.Identity.ID, ...API.Identity.ID[]]} ids
   */
  constructor(ids) {
    this.ids = ids
  }
  get message() {
    if (this.ids.length > 1) {
      return `No account is registered with such identifiers:\n - ${this.ids.join(
        "\n - "
      )}`
    } else {
      return `No account is registered for ${this.ids[0]}`
    }
  }
  get error() {
    return /** @type {true} */ (true)
  }
  /** @type {"NotRegistered"} */
  get name() {
    return "NotRegistered"
  }
  toJSON() {
    const { name, message, ids, error } = this

    return { name, message, ids, error }
  }
}

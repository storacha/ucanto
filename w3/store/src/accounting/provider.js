import * as API from '../type.js'

/**
 * @typedef {import("../identity/provider").KVStore<API.DID, Map<string, API.Accounting.Link|null>>} DB
 * @typedef {{has(id:string): API.Await<boolean>}} Bucket
 * @param {{db:DB, cars:Bucket}} context
 * @returns {API.Accounting.Provider}
 */
export const create = ({ db, cars }) => ({
  /**
   * @param {API.DID} group
   * @param {API.Accounting.Link} link
   * @param {API.LinkedProof} proof
   */
  async add(group, link, proof) {
    const [members, have] = await Promise.all([
      db.get(group),
      cars.has(`${link}/data`),
    ])

    if (members) {
      members.set(`${link}`, link)
      db.set(group, members)
    } else {
      db.set(group, new Map([[`${link}`, link]]))
    }

    return have ? { status: 'in-s3' } : { status: 'not-in-s3' }
  },
  /**
   * @param {API.DID} group
   * @param {API.Accounting.Link} link
   * @param {API.LinkedProof} proof
   */
  async remove(group, link, proof) {
    const members = await db.get(group)
    if (members) {
      members.set(`${link}`, null)
    }
    return null
  },
  /**
   * @param {API.DID} group
   * @param {API.LinkedProof} proof
   */
  async list(group, proof) {
    const members = await db.get(group)
    const links = []
    for (const member of members?.values() || []) {
      if (member) {
        links.push(member)
      }
    }
    return links
  },
})

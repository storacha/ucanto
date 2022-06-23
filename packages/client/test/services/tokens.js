import * as API from '../api.js'
import { the, unreachable } from './util.js'

/**
 * @param {Map<string, API.Found|API.RevokedError|API.ExpiredError>} store
 * @returns {API.TokenStore}
 */
export const create = (store) => new TokenService(store)

/**
 * @implements {API.TokenStore}
 */
class TokenService {
  /**
   * @param {Map<string, API.Found|API.RevokedError|API.ExpiredError>} store
   */
  constructor(store = new Map()) {
    this.store = store
  }
  /**
   * @param {Iterable<API.TokenEntry>} tokens
   */
  async insert(tokens) {
    for (const token of tokens) {
      const id = token.cid.toString()
      const record = this.store.get(id) || new NotFoundError(token.cid)

      switch (record.status) {
        case 'not-found':
          this.store.set(id, new Found(token))
        case 'ok':
          break // no-op as we already have this token
        case 'revoked':
          // if we do not have this token yet store even though it is expired
          if (record.bytes == null) {
            record.bytes = token.bytes
          }
        case 'expired':
          break // if it already expired we got nothing todo
        default:
          return unreachable`Record has unexpected state ${record}`
      }
    }
    return null
  }
  /**
   * @template {Record<string, API.Link>} Query
   * @param {Query} query
   * @returns {Promise<API.SelectResult<Query>>}
   */
  async select(query) {
    const result = /** @type {API.SelectResult<Query>} */ ({})
    for (const [key, cid] of Object.entries(query)) {
      const id = /** @type {keyof Query} */ (key)

      result[id] = this.store.get(cid.toString()) || new NotFoundError(cid)
    }

    return result
  }

  /**
   * @param {API.Link} cid
   * @param {API.TokenEntry} revocation
   */
  async revoke(cid, revocation) {
    // store the revocation we
    await this.insert([revocation])
    const { record } = await this.select({ record: cid })
    const id = cid.toString()
    switch (record.status) {
      case 'ok':
        this.store.set(id, new RevokedError(revocation.cid, cid, record))
      case 'expired':
      case 'not-found':
        this.store.set(id, new RevokedError(revocation.cid, cid, null))
      case 'revoked':
        break // noop
      default:
        return unreachable`record has unknown state ${record}`
    }

    return null
  }

  async gc() {
    const now = Date.now()
    for (const [id, record] of this.store.entries()) {
      // if record has not been marked expired nor had it been revoked yet
      // and it's past it's ttl expire it.
      if (!record.error && record.ttl < now) {
        this.store.set(id, new ExpiredError(record.cid, record.ttl))
      }
    }
  }
}

class Found {
  /**
   * @param {API.TokenEntry} token
   */
  constructor({ cid, bytes, ttl }) {
    this.ok = the(true)
    this.cid = cid
    this.bytes = bytes
    this.ttl = ttl
    this.status = the('ok')
  }
}

/**
 * @implements {API.NotFoundError}
 */
class NotFoundError extends RangeError {
  /**
   * @param {API.Link} cid
   */
  constructor(cid) {
    super()
    this.error = the(true)
    this.cid = cid

    this.status = the('not-found')
  }
}

/**
 * @implements {API.RevokedError}
 */
class RevokedError extends Error {
  /**
   * @param {API.Link} proof
   * @param {API.Link} cid
   * @param {API.TokenEntry|null} token
   */
  constructor(proof, cid, token) {
    super()
    this.error = the(true)
    this.status = the('revoked')
    this.proof = proof
    this.cid = cid
    this.bytes = token ? token.bytes : null
    this.ttl = token ? token.ttl : null
  }
}

/**
 * @implements {API.ExpiredError}
 */
class ExpiredError extends Error {
  /**
   * @param {API.Link} cid
   * @param {number} expiry
   */
  constructor(cid, expiry) {
    super()
    this.error = the(true)
    this.status = the('expired')
    this.cid = cid
    this.expiry = expiry
  }
}

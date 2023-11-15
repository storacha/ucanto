import * as API from '@ucanto/interface'
import * as CBOR from '@ipld/dag-cbor'
export { code, name, decode } from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { create as createLink, isLink } from 'multiformats/link'

// @see https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-cbor
export const contentType = 'application/vnd.ipld.dag-cbor'

/**
 * @param {unknown} data
 * @param {Set<unknown>} seen
 * @returns {unknown}
 */
const prepare = (data, seen) => {
  if (seen.has(data)) {
    throw new TypeError('Can not encode circular structure')
  }
  // top level undefined is ok
  if (data === undefined && seen.size === 0) {
    return null
  }

  if (data === null) {
    return null
  }

  if (typeof data === 'symbol' && seen.size === 0) {
    return null
  }

  if (isLink(data)) {
    return data
  }

  if (ArrayBuffer.isView(data)) {
    return data
  }

  if (Array.isArray(data)) {
    seen.add(data)
    const items = []
    for (const item of data) {
      items.push(
        item === undefined || typeof item === 'symbol'
          ? null
          : prepare(item, seen)
      )
    }
    return items
  }

  if (typeof (/** @type {{toJSON?:unknown}} */ (data).toJSON) === 'function') {
    seen.add(data)
    const json = /** @type {{toJSON():unknown}} */ (data).toJSON()
    return prepare(json, seen)
  }

  if (typeof data === 'object') {
    seen.add(data)
    /** @type {Record<string, unknown>} */
    const object = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && typeof value !== 'symbol') {
        object[key] = prepare(value, new Set(seen))
      }
    }
    return object
  }

  return data
}

/**
 * @template T
 * @param {T} data
 * @returns {CBOR.ByteView<T>}
 */
export const encode = data =>
  /** @type {CBOR.ByteView<T>} */ (CBOR.encode(prepare(data, new Set())))

/**
 * @template T
 * @param {API.ByteView<T>} bytes
 * @param {{hasher?: API.MultihashHasher }} options
 * @returns {Promise<API.Link<T, typeof CBOR.code>>}
 *
 */
export const link = async (bytes, { hasher = sha256 } = {}) => {
  return /** @type {API.Link<T, typeof CBOR.code>} */ (
    createLink(CBOR.code, await hasher.digest(bytes))
  )
}

/**
 * @template T
 * @param {T} data
 * @param {{hasher?: API.MultihashHasher }} [options]
 * @returns {Promise<API.Block<T, typeof CBOR.code>>}
 */
export const write = async (data, options) => {
  const bytes = encode(data)
  const cid = await link(bytes, options)

  return { cid, bytes }
}

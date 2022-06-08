import * as CBOR from "@ipld/dag-cbor"
import { CID } from "multiformats/cid"
export { code, decode } from "@ipld/dag-cbor"
import { sha256 } from "multiformats/hashes/sha2"
/**
 * @param {unknown} data
 * @param {Set<unknown>} seen
 * @returns {unknown}
 */
const prepare = (data, seen) => {
  if (seen.has(data)) {
    throw new TypeError("Can not encode circular structure")
  }
  // top level undefined is ok
  if (data === undefined && seen.size === 0) {
    return null
  }

  if (data === null) {
    return null
  }

  if (typeof data === "symbol" && seen.size === 0) {
    return null
  }

  const cid = CID.asCID(data)
  if (cid) {
    return cid
  }

  if (Array.isArray(data)) {
    seen.add(data)
    const items = []
    for (const item of data) {
      items.push(
        item === undefined || typeof item === "symbol"
          ? null
          : prepare(item, seen)
      )
    }
    return items
  }

  if (typeof (/** @type {{toJSON?:unknown}} */ (data).toJSON) === "function") {
    seen.add(data)
    const json = /** @type {{toJSON():unknown}} */ (data).toJSON()
    return prepare(json, seen)
  }

  if (typeof data === "object") {
    seen.add(data)
    /** @type {Record<string, unknown>} */
    const object = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && typeof value !== "symbol") {
        object[key] = prepare(value, seen)
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
export const encode = data => CBOR.encode(prepare(data, new Set()))

/**
 * @template T
 * @param {T} data
 * @param {{hasher?: import('multiformats/hashes/interface').MultihashHasher }} [options]
 */
export const write = async (data, { hasher = sha256 } = {}) => {
  const bytes = encode(data)
  const digest = await hasher.digest(bytes)
  const cid = CID.createV1(CBOR.code, digest)
  return { cid, bytes }
}

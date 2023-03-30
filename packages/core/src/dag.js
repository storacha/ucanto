import * as API from '@ucanto/interface'
import { create as createLink } from './link.js'
import { sha256 } from 'multiformats/hashes/sha2'
import * as MF from 'multiformats/interface'
import * as CBOR from './cbor.js'

/**
 * Function takes arbitrary value and if it happens to be an `IPLDView`
 * it will iterate over it's blocks. It is just a convenience for traversing
 * arbitrary structures that may contain `IPLDView`s in them. 
 * Note if you pass anything other than `IPLDView` it will not attempt
 * to find views nested inside them, instead it will just emit no blocks.
 * @param {unknown} value.
 *
 * @returns {IterableIterator<API.Block>}
 */
export const iterate = function* (value) {
  if (
    value &&
    typeof value === 'object' &&
    'iterateIPLDBlocks' in value &&
    typeof value.iterateIPLDBlocks === 'function'
  ) {
    yield* value.iterateIPLDBlocks()
  }
}

/**
 * @template T
 * @typedef {Map<API.ToString<API.Link>, API.Block<T>>} BlockStore
 */

/**
 * @template [T=unknown]
 * @returns {BlockStore<T>}
 */
export const createStore = () => new Map()

/**
 * @template T
 * @template {T} U
 * @param {U} source
 * @param {BlockStore<T>} store
 * @param {object} options
 * @param {MF.BlockEncoder<number, U>} [options.codec]
 * @param {MF.MultihashHasher} [options.hasher]
 * @returns {Promise<API.Block<U> & { data: U }>}
 */
export const encodeInto = async (
  source,
  store,
  { codec = CBOR, hasher = sha256 } = {}
) => {
  const bytes = codec.encode(source)
  const digest = await hasher.digest(bytes)
  /** @type {API.Link<U, typeof codec.code, typeof hasher.code>} */
  const link = createLink(codec.code, digest)
  store.set(/** @type {API.ToString<typeof link>} */ (link.toString()), {
    bytes,
    cid: link,
  })

  return { bytes, cid: link, data: source }
}

/**
 * @template T
 * @template {T} U
 * @param {API.Block<U>} block
 * @param {BlockStore<T>} store
 * @returns {API.Block<U>}
 */
export const addInto = ({ cid, bytes }, store) => {
  store.set(/** @type {API.ToString<typeof cid>} */ (cid.toString()), {
    bytes,
    cid,
  })

  return { bytes, cid }
}

/**
 * @template T
 * @template {T} U
 * @param {Iterable<API.Block<U>>} source
 * @param {BlockStore<T>} store
 */
export const addEveryInto = (source, store) => {
  for (const block of source) {
    addInto(block, store)
  }
}

/**
 * @template T
 * @param {API.Link<T>} link
 * @param {BlockStore<T>} store
 * @returns {API.Block<T> & { data: T }}
 */
export const decodeFrom = (link, store) => {
  const block = store.get(`${link}`)
  /* c8 ignore next 3 */
  if (!block) {
    throw new Error(`Block for the ${link} is not found`)
  }
  const data = /** @type {T} */ (CBOR.decode(block.bytes))
  return { cid: link, bytes: block.bytes, data }
}

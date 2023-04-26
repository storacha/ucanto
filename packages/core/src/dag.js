import * as API from '@ucanto/interface'
import { create as createLink } from './link.js'
import { sha256 } from 'multiformats/hashes/sha2'
import * as MF from 'multiformats/interface'
import * as CBOR from './cbor.js'
import { identity } from 'multiformats/hashes/identity'

export { CBOR, sha256, identity }

/**
 * Function takes arbitrary value and if it happens to be an `IPLDView`
 * it will iterate over it's blocks. It is just a convenience for traversing
 * arbitrary structures that may contain `IPLDView`s in them.
 * Note if you pass anything other than `IPLDView` it will not attempt
 * to find views nested inside them, instead it will just emit no blocks.
 *
 * @param {unknown} value
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
 * @template [T=unknown]
 * @typedef {Map<API.ToString<API.Link>, API.Block<T, number, number, 0>|API.Block<T, number, number, 1>>} BlockStore
 */

/**
 * @template [T=unknown]
 * @param {API.Block<T>[]} blocks
 * @returns {API.BlockStore<T>}
 */
export const createStore = (blocks = []) => {
  const store = new Map()
  addEveryInto(blocks, store)
  return store
}

/** @type {API.MulticodecCode<typeof identity.code, typeof identity.name>} */
const EMBED_CODE = identity.code

/**
 * Gets block corresponding to the given CID from the store. If store does not
 * contain the block, `fallback` is returned. If `fallback` is not provided, it
 * will throw an error.
 *
 * @template {0|1} V
 * @template {T} U
 * @template T
 * @template {API.MulticodecCode} Format
 * @template {API.MulticodecCode} Alg
 * @template [E=never]
 * @param {API.Link<U, Format, Alg, V>} cid
 * @param {BlockStore<T>} store
 * @param {E} [fallback]
 * @returns {API.Block<U, Format, Alg, V>|E}
 */
export const get = (cid, store, fallback) => {
  // If CID uses identity hash, we can return the block data directly
  if (cid.multihash.code === EMBED_CODE) {
    return { cid, bytes: cid.multihash.digest }
  }

  const block = /** @type {API.Block<U, Format, Alg, V>|undefined} */ (
    store.get(`${cid}`)
  )
  return block ? block : fallback === undefined ? notFound(cid) : fallback
}

/**
 * @template T
 * @template {T} U
 * @param {U} source
 * @template {API.MulticodecCode} [C=API.MulticodecCode<typeof CBOR.code, typeof CBOR.name>]
 * @param {object} options
 * @param {MF.BlockEncoder<C, U>} [options.codec]
 * @returns {API.Block<U, C, typeof EMBED_CODE> & { data: U }}
 */
export const embed = (source, { codec } = {}) => {
  const encoder = /** @type {MF.BlockEncoder<C, U>}  */ (codec || CBOR)
  const bytes = encoder.encode(source)
  const digest = identity.digest(bytes)
  return {
    cid: createLink(encoder.code, digest),
    bytes,
    data: source,
  }
}

/**
 * @param {API.Link<*, *, *, *>} link
 * @returns {never}
 */
export const notFound = link => {
  throw new Error(`Block for the ${link} is not found`)
}

/**
 * @template T
 * @template {T} U
 * @template {API.MulticodecCode} C
 * @template {API.MulticodecCode} A
 * @param {U} source
 * @param {BlockStore<T>} store
 * @param {object} options
 * @param {MF.BlockEncoder<C, unknown>} [options.codec]
 * @param {MF.MultihashHasher<A>} [options.hasher]
 * @returns {Promise<API.Block<U, C, A> & { data: U }>}
 */
export const writeInto = async (source, store, options = {}) => {
  const codec = /** @type {MF.BlockEncoder<C, U>} */ (options.codec || CBOR)
  const hasher = /** @type {MF.MultihashHasher<A>} */ (options.hasher || sha256)

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

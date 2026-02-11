import * as Block from 'multiformats/block'
import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'

/**
 * @param {any} value
 */
export async function getBlock(value) {
  return await Block.encode({
    value,
    codec,
    hasher,
  })
}

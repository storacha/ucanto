import { CAR } from "@ucanto/transport/car"
import { Delegation } from "@ucanto/core"
import { sha256 } from "multiformats/hashes/sha2"
import * as CBOR from "@ipld/dag-cbor"
import * as UCAN from "@ipld/dag-ucan"
import * as API from "@ucanto/interface"
import { KeyPair } from "ucan-storage/keypair"

const CAR_CODE = 0x0202

/**
 * @param {UCAN.Block[]} blocks
 */
export const encodeCAR = blocks => {
  const root = /** @type {UCAN.Block} */ (blocks.pop())
  const writer = CAR.createWriter()
  writer.write(...blocks)
  return writer.flush(root)
}

/**
 * @param {UCAN.Block[]} blocks
 */

export const writeCAR = async blocks => {
  const bytes = encodeCAR(blocks)
  /** @type {API.Link} */
  const cid = /** @type {any} */ (
    CAR.CID.createV1(CAR_CODE, await sha256.digest(bytes))
  )
  return { cid, bytes }
}

/**
 * @template T
 * @param {T} data
 * @returns {Promise<UCAN.Block>}
 */
export const writeCBOR = async data => {
  const bytes = CBOR.encode(data)
  const cid =
    /** @type {CAR.CID & UCAN.Link<T, 1, typeof CBOR.code, typeof sha256.code>} */ (
      CAR.CID.createV1(CBOR.code, await sha256.digest(bytes))
    )
  return { cid, bytes }
}

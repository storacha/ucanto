import * as CAR from "../packages/transport/car/codec.js/index.js.js"
import { sha256 } from "multiformats/hashes/sha2"
import * as CBOR from "@ipld/dag-cbor"
import * as UCAN from "@ipld/dag-ucan"
import * as API from "../src/api.js"
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

/**
 * @param {string} secret
 */
export const importIssuer = async secret =>
  /** @type {UCAN.Issuer} */
  (
    Object.assign(await KeyPair.fromExportedKey(secret), {
      algorithm: 0xed,
    })
  )

export const importActors = async () => {
  /** did:key:z6Mkqa4oY9Z5Pf5tUcjLHLUsDjKwMC95HGXdE1j22jkbhz6r */
  const alice = await importIssuer(
    "M2lcKUizE18z4RW+hVT+v2vK98FU3WSSiNl2AVTuSIg="
  )

  /** did:key:z6Mkt5D5eLyqwW7YZDuoRviTPaoTbGsG3aaYdTtohnj2Rn5T */
  const bob = await importIssuer("r3ME2oLXyMwRokpviJ6eTdSn3iqssmLuZ0CeyMfZ0p8=")

  /** did:key:z6MktQnrpGvvH19Uey9kxi4uEnRkwMdWm63GUN6BRvu7ueVD */
  const mallory = await importIssuer(
    "qdxYqW84MpmAxyEHyHEBn5MY6gVFzU6xgX+LHtbv0rw="
  )

  /** did:key:z6MkvoW1bbi9nJ8rRfX6keYoecLncn559bgPCmBfATZ9pr68 */
  const web3Storage = await importIssuer(
    "ip+ljMXCYgcE0HY2YtjRud34m1Gt5OrOxtoxVTbRvcc="
  )

  /** did:key:z6Mku83JhJvLotjoy3ogeEUgHcm6YjyX8N2jCB4VyEdtnLsX */
  const nftStorage = await importIssuer(
    "A/sfSMj618R41xFuB8b0l2zwPc65LTl6vYclR/jYjy0="
  )

  return { alice, bob, mallory, nftStorage, web3Storage }
}

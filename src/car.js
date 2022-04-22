import * as API from './api.js'
import * as CARWriter from '@ipld/car/buffer-writer'
import { CarReader } from '@ipld/car/reader'
import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'

export { CID }

/**
 * @typedef {API.Block|CARWriter.Block} Block
 */

class Writer {
  /**
   * @param {Block[]} blocks
   * @param {number} byteLength
   */
  constructor(blocks = [], byteLength = 0) {
    this.written = new Set()
    this.blocks = blocks
    this.byteLength = byteLength
  }
  /**
   * @param {Block[]} blocks
   */
  write(...blocks) {
    for (const block of blocks) {
      const id = block.cid.toString(base32)
      if (!this.written.has(id)) {
        this.blocks.push(block)
        this.byteLength += CARWriter.blockLength(
          /** @type {CARWriter.Block} */ (block)
        )
      }
    }
    return this
  }
  /**
   * @param {API.Block[]} rootBlocks
   */
  flush(...rootBlocks) {
    const roots = []
    for (const block of rootBlocks.reverse()) {
      const id = block.cid.toString(base32)
      if (!this.written.has(id)) {
        this.blocks.unshift(block)
        this.byteLength += CARWriter.blockLength(
          /** @type {CARWriter.Block} */ (block)
        )
      }
      roots.push(/** @type {CARWriter.CID} */ (block.cid))
    }

    this.byteLength += CARWriter.headerLength({ roots })

    const buffer = new ArrayBuffer(this.byteLength)
    const writer = CARWriter.createWriter(buffer, { roots })

    for (const block of /** @type {CARWriter.Block[]} */ (this.blocks)) {
      writer.write(block)
    }

    return writer.close()
  }
}

export const createWriter = () => new Writer()

/**
 * @param {{roots:API.Block[], blocks:Iterable<API.Block> }} input
 */
export const encode = ({ roots, blocks }) => {
  const writer = new Writer()
  writer.write(...blocks)
  return writer.flush(...roots)
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<{roots:API.Block[], blocks:API.Block[]}>}
 */
export const decode = async (bytes) => {
  const reader = await /** @type {any} */ (CarReader.fromBytes(bytes))
  /** @type {{_header: { roots: CARWriter.CID[] }, _keys: string[], _blocks: API.Block[] }} */
  const { _header, _blocks, _keys } = reader
  const roots = []
  const blocks = []
  const index = _header.roots.map((cid) => _keys.indexOf(String(cid)))

  for (const [n, block] of _blocks.entries()) {
    if (index.includes(n)) {
      roots.push(block)
    } else {
      blocks.push(block)
    }
  }

  return { roots, blocks }
}

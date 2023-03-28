import * as API from '@ucanto/interface'
import * as CAR from './codec.js'
import { Receipt } from '@ucanto/core'

export { CAR as codec }

const HEADERS = Object.freeze({
  'content-type': 'application/car',
})

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template {API.Tuple<API.Receipt>} I
 * @param {I} receipts
 * @param {API.EncodeOptions} [options]
 * @returns {Promise<API.HTTPResponse<I>>}
 */
export const encode = async (receipts, options) => {
  const roots = []
  const blocks = new Map()
  for (const receipt of receipts) {
    const reader = await receipt.buildIPLDView()
    roots.push(reader.root)
    for (const block of reader.iterateIPLDBlocks()) {
      blocks.set(block.cid.toString(), block)
    }
    // blocks.delete(reader.root.cid.toString())
  }
  const body = CAR.encode({ roots, blocks })

  return {
    headers: HEADERS,
    body,
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template {API.Tuple<API.Receipt>} I
 * @param {API.HTTPRequest<I>} request
 * @returns {I}
 */
export const decode = ({ headers, body }) => {
  const contentType = headers['content-type'] || headers['Content-Type']
  if (contentType !== 'application/car') {
    throw TypeError(
      `Only 'content-type: application/car' is supported, instead got '${contentType}'`
    )
  }

  const { roots, blocks } = CAR.decode(body)

  const receipts = /** @type {API.Receipt[]} */ ([])

  for (const root of /** @type {API.UCANBlock[]} */ (roots)) {
    receipts.push(
      Receipt.view({
        root: root.cid,
        blocks: /** @type {Map<string, API.Block>} */ (blocks),
      })
    )
  }

  return /** @type {I} */ (receipts)
}

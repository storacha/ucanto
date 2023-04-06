import * as API from '@ucanto/interface'
import { CAR, CBOR, DAG, Delegation, Invocation, parseLink } from '@ucanto/core'
import { Receipt, Report } from '@ucanto/core'
export { CAR as codec }
import * as Schema from '../schema.js'

const HEADERS = Object.freeze({
  'content-type': 'application/car',
})

/**
 * Encodes {@link API.AgentMessage} into an HTTPRequest.
 *
 * @template {API.Tuple<API.Receipt>} I
 * @param {API.ReportBuilder<I>} report
 * @param {API.EncodeOptions} [options]
 * @returns {Promise<API.HTTPResponse<API.ReportModel<I>>>}
 */
export const encode = async (report, options) => {
  const blocks = new Map()
  const view = await report.buildIPLDView(options)
  for (const block of view.iterateIPLDBlocks()) {
    blocks.set(block.cid.toString(), block)
  }

  const body = CAR.encode({ roots: [view.root], blocks })

  return {
    headers: HEADERS,
    body,
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template {API.Tuple<API.Receipt>} I
 * @param {API.HTTPRequest<API.ReportModel<I>>} request
 * @returns {Promise<API.Report<I>>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers['content-type'] || headers['Content-Type']
  if (contentType !== 'application/car') {
    throw TypeError(
      `Only 'content-type: application/car' is supported, instead got '${contentType}'`
    )
  }

  const report = Report.builder()
  const { roots, blocks } = CAR.decode(body)
  if (roots.length > 0)
    for (const root of roots) {
      const block = DAG.get(root.cid, blocks)
      const data = DAG.CBOR.decode(block.bytes)
      const [branch, model] = Schema.Outbound.match(data)

      switch (branch) {
        case 'ucanto/report@0.1.0': {
          for (const [key, link] of Object.entries(model.receipts)) {
            report.set(parseLink(key), Receipt.view({ root: link, blocks }))
          }
        }
      }
    }

  return report.buildIPLDView()
}

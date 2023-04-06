import * as API from '@ucanto/interface'
import { CAR, CBOR, DAG, Invocation, Message, Message } from '@ucanto/core'
import * as Schema from '../schema.js'

export { CAR as codec }

const HEADERS = Object.freeze({
  'content-type': 'application/car',
  // We will signal that we want to receive a CAR file in the response
  accept: 'application/car',
})

/**
 * Encodes workflow into an HTTPRequest.
 *
 * @template {API.AgentMessage} Message
 * @param {Message} message
 * @param {API.EncodeOptions & { headers?: Record<string, string> }} [options]
 * @returns {Promise<API.HTTPRequest<Message>>}
 */
export const encode = async (message, options) => {
  const blocks = new Map()
  for (const block of message.iterateIPLDBlocks()) {
    blocks.set(`${block.cid}`, block)
  }

  /**
   * Cast to Uint8Array to remove phantom type set by the
   * CAR encoder which is too specific.
   *
   * @type {Uint8Array}
   */
  const body = CAR.encode({
    roots: [message.root],
    blocks,
  })

  return {
    headers: options?.headers || HEADERS,
    body,
  }
}

/**
 * Decodes Workflow from HTTPRequest.
 *
 * @template {API.AgentMessage} Message
 * @param {API.HTTPRequest<Message>} request
 * @returns {Promise<Message>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers['content-type'] || headers['Content-Type']
  if (contentType !== 'application/car') {
    throw TypeError(
      `Only 'content-type: application/car' is supported, instead got '${contentType}'`
    )
  }

  const { roots, blocks } = CAR.decode(/** @type {Uint8Array} */ (body))
  Message.view({ root: roots[0], store: blocks })

  // CARs can contain v0 blocks but we don't have to thread that type through.
  const store = /** @type {Map<string, API.Block>} */ (blocks)
  const run = []

  for (const { cid } of roots) {
    const block = DAG.get(cid, store)
    const data = CBOR.decode(block.bytes)

    const [branch, value] = Schema.Inbound.match(data)
    switch (branch) {
      case 'ucanto/workflow@0.1.0': {
        for (const root of value.run) {
          const invocation = Invocation.view({
            root,
            blocks: store,
          })
          run.push(invocation)
        }
        break
      }
      default: {
        const invocation = Invocation.create({
          root: { ...block, data: value },
          blocks: store,
        })
        run.push(invocation)
      }
    }
  }

  return { run: /** @type {API.InferInvocations<Invocations>} */ (run) }
}

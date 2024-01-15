import * as API from '@ucanto/interface'
import { CAR, Message } from '@ucanto/core'

export { CAR as codec }

export const contentType = CAR.contentType

const HEADERS = Object.freeze({
  'content-type': contentType,
  // We will signal that we want to receive a CAR file in the response
  accept: contentType,
})

/**
 * Encodes `AgentMessage` into an `HTTPRequest`.
 *
 * @template {API.AgentMessage} Message
 * @param {Message} message
 * @param {API.EncodeOptions & { headers?: Record<string, string> }} [options]
 * @returns {API.HTTPRequest<Message>}
 */
export const encode = (message, options) => {
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
    headers: options?.headers || { ...HEADERS },
    body,
  }
}

/**
 * Decodes `AgentMessage` from the received `HTTPRequest`.
 *
 * @template {API.AgentMessage} Message
 * @param {API.HTTPRequest<Message>} request
 * @returns {Promise<Message>}
 */
export const decode = async ({ headers, body }) => {
  const { roots, blocks } = CAR.decode(/** @type {Uint8Array} */ (body))
  const message = Message.view({ root: roots[0].cid, store: blocks })
  return /** @type {Message} */ (message)
}

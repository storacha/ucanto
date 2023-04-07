import * as API from '@ucanto/interface'
import * as CBOR from '@ucanto/core/cbor'
export const contentType = 'application/cbor'

const HEADERS = Object.freeze({
  'content-type': contentType,
})

/**
 * Encodes `AgentMessage` into a legacy CBOR representation.
 *
 * @template {API.AgentMessage} Message
 * @param {Message} message
 * @param {API.EncodeOptions} [options]
 * @returns {API.HTTPResponse<Message>}
 */
export const encode = (message, options) => {
  const legacyResults = []
  for (const receipt of message.receipts.values()) {
    const result = receipt.out
    if (result.ok) {
      legacyResults.push(result.ok)
    } else {
      legacyResults.push({
        ...result.error,
        error: true,
      })
    }
  }

  /** @type {Uint8Array} */
  const body = CBOR.encode(legacyResults)

  return /** @type {API.HTTPResponse<Message>} */ ({
    headers: HEADERS,
    body,
  })
}

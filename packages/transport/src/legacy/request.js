import * as CAR from '@ucanto/core/car'
import * as API from '@ucanto/interface'
import { Invocation, Message } from '@ucanto/core'

export const contentType = 'application/car'

/**
 * @template {API.AgentMessage} Message
 * @param {API.HTTPRequest<Message>} request
 */
export const decode = async ({ body }) => {
  const { roots, blocks } = CAR.decode(/** @type {Uint8Array} */ (body))
  /** @type {API.IssuedInvocation[]} */
  const run = []
  for (const { cid } of roots) {
    // We don't have a way to know if the root matches a ucan link.
    const invocation = Invocation.view({
      root: /** @type {API.Link} */ (cid),
      blocks,
    })
    run.push(invocation)
  }

  const message = await Message.build({
    invocations: /** @type {API.Tuple<API.IssuedInvocation>} */ (run),
  })

  return /** @type {Message} */ (message)
}

import * as API from '@ucanto/interface'
import * as DAG from './dag.js'
import * as Receipt from './receipt.js'

/**
 * @template {API.Capability} C
 * @template {Record<string, any>} T
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @param {object} source
 * @param {I} source.invocations
 */
export const build = ({ invocations }) =>
  new MessageBuilder({ invocations }).buildIPLDView()

/**
 * @template T
 * @param {object} source
 * @param {Required<API.Block<API.AgentMessageModel<T>>>} source.root
 * @param {Map<string, API.Block>} source.store
 */
export const view = ({ root, store }) => new Message({ root, store })

/**
 * @template T
 * @param {object} source
 * @param {API.Link} source.root
 * @param {Map<string, API.Block>} source.store
 */
export const match = ({ root, store }) => {}

/**
 * @template {API.Capability} C
 * @template {Record<string, any>} T
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @implements {API.AgentMessageBuilder<{In: I }>}
 */
class MessageBuilder {
  /**
   * @param {object} source
   * @param {I} source.invocations
   */
  constructor({ invocations }) {
    this.invocations = invocations
  }
  /**
   *
   * @param {API.BuildOptions} [options]
   * @returns {Promise<Message<{ In: I }>>}
   */
  async buildIPLDView(options) {
    const store = new Map()
    const execute = []
    for (const invocation of this.invocations) {
      const view = await invocation.buildIPLDView(options)
      execute.push(view.link())
      for (const block of view.iterateIPLDBlocks()) {
        store.set(`${block.cid}`, block)
      }
    }

    const root = await DAG.writeInto(
      {
        'ucanto/message@0.6.0': {
          execute: /** @type {API.Tuple<any>} */ (execute),
        },
      },
      store,
      options
    )

    return new Message({ root, store })
  }
}

/**
 * @template T
 * @implements {API.AgentMessage<T>}
 */
class Message {
  /**
   * @param {object} source
   * @param {Required<API.Block<API.AgentMessageModel<T>>>} source.root
   * @param {Map<string, API.Block>} source.store
   */
  constructor({ root, store }) {
    this.root = root
    this.store = store
  }
  iterateIPLDBlocks() {
    return this.store.values()
  }
  /**
   * @param {API.Link} link
   */
  get(link) {
    const receipts = this.root.data['ucanto/message@0.6.0'].report || {}
    const receipt = receipts[`${link}`]
    return Receipt.view({ root: receipt, blocks: this.store })
  }

  get invocations() {
    return this.root.data['ucanto/message@0.6.0'].execute || []
  }
}

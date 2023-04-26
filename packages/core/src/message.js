import * as API from '@ucanto/interface'
import * as DAG from './dag.js'
import { Invocation, panic } from './lib.js'
import * as Receipt from './receipt.js'
import * as Schema from './schema.js'

export const MessageSchema = Schema.variant({
  'ucanto/message@7.0.0': Schema.struct({
    execute: Schema.link().array().optional(),
    delegate: Schema.dictionary({
      key: Schema.string(),
      value: /** @type {API.Reader<API.Link<API.ReceiptModel>>} */ (
        Schema.link()
      ),
    })
      .array()
      .optional(),
  }),
})

/**
 * @template {API.Tuple<API.IssuedInvocation>} I
 * @template {API.Tuple<API.Receipt>} R
 * @param {object} source
 * @param {I} [source.invocations]
 * @param {R} [source.receipts]
 * @returns {Promise<API.AgentMessage<{ In: API.InferInvocations<I>, Out: R }>>}
 */
export const build = ({ invocations, receipts }) =>
  new MessageBuilder({ invocations, receipts }).buildIPLDView()

/**
 * @template [E=never]
 * @param {object} source
 * @param {API.Link} source.root
 * @param {DAG.BlockStore} source.store
 * @param {E} [fallback]
 * @returns {API.AgentMessage|E}
 */
export const view = ({ root, store }, fallback) => {
  const block = DAG.get(root, store, null)
  if (block === null) {
    return fallback !== undefined ? fallback : DAG.notFound(root)
  }
  const data = DAG.CBOR.decode(block.bytes)
  const [branch, value] = MessageSchema.match(data, fallback)
  switch (branch) {
    case 'ucanto/message@7.0.0':
      return new Message({ root: { ...block, data }, store })
    default:
      return value
  }
}

/**
 * @template {API.Tuple<API.IssuedInvocation>} I
 * @template {API.Tuple<API.Receipt>} R
 * @implements {API.AgentMessageBuilder<{In: API.InferInvocations<I>, Out: R }>}
 *
 */
class MessageBuilder {
  /**
   * @param {object} source
   * @param {I} [source.invocations]
   * @param {R} [source.receipts]
   */
  constructor({ invocations, receipts }) {
    this.invocations = invocations
    this.receipts = receipts
  }
  /**
   *
   * @param {API.BuildOptions} [options]
   * @returns {Promise<Message<{ In: API.InferInvocations<I>, Out: R }>>}
   */
  async buildIPLDView(options) {
    const store = new Map()

    const { invocations, ...executeField } = await writeInvocations(
      this.invocations || [],
      store
    )

    const { receipts, ...receiptsField } = await writeReceipts(
      this.receipts || [],
      store
    )

    const root = await DAG.writeInto(
      /** @type {API.AgentMessageModel<{ In: API.InferInvocations<I>, Out: R }>} */
      ({
        'ucanto/message@7.0.0': {
          ...executeField,
          ...receiptsField,
        },
      }),
      store,
      options
    )

    return new Message({ root, store }, { receipts, invocations })
  }
}

/**
 *
 * @param {API.IssuedInvocation[]} run
 * @param {Map<string, API.Block>} store
 */
const writeInvocations = async (run, store) => {
  const invocations = []
  const execute = []
  for (const invocation of run) {
    const view = await invocation.buildIPLDView()
    execute.push(view.link())
    invocations.push(view)
    for (const block of view.iterateIPLDBlocks()) {
      store.set(`${block.cid}`, block)
    }
  }

  return { invocations, ...(execute.length > 0 ? { execute } : {}) }
}

/**
 * @param {API.Receipt[]} source
 * @param {Map<string, API.Block>} store
 */
const writeReceipts = async (source, store) => {
  if (source.length === 0) {
    return {}
  }

  const receipts = new Map()
  /** @type {Record<API.ToString<API.ReceiptModel['ocm']['ran']>, API.Link<API.ReceiptModel>>} */
  const report = {}

  for (const [n, receipt] of source.entries()) {
    const view = await receipt.buildIPLDView()
    for (const block of view.iterateIPLDBlocks()) {
      store.set(`${block.cid}`, block)
    }

    const key = `${view.ran.link()}`
    if (!(key in report)) {
      report[key] = view.root.cid
      receipts.set(key, view)
    } else {
      // In theory we could have gotten the same invocation twice and both
      // should get same receipt. In legacy code we send tuple of results
      // as opposed to a map keyed by invocation to keep old clients working
      // we just stick the receipt in the map with a unique key so that when
      // legacy encoder maps entries to array it will get both receipts in
      // the right order.
      receipts.set(`${key}@${n}`, view)
    }
  }

  return { receipts, report }
}

/**
 * @template {{ In: API.Invocation[], Out: API.Receipt[] }} T
 * @implements {API.AgentMessage<T>}
 */
class Message {
  /**
   * @param {object} source
   * @param {Required<API.Block<API.AgentMessageModel<T>>>} source.root
   * @param {DAG.BlockStore} source.store
   * @param {object} build
   * @param {API.Invocation[]} [build.invocations]
   * @param {Map<string, API.Receipt>} [build.receipts]
   */
  constructor({ root, store }, { invocations, receipts } = {}) {
    this.root = root
    this.store = store
    this._invocations = invocations
    this._receipts = receipts
  }
  *iterateIPLDBlocks() {
    for (const invocation of this.invocations) {
      yield* invocation.iterateIPLDBlocks()
    }

    for (const receipt of this.receipts.values()) {
      yield* receipt.iterateIPLDBlocks()
    }

    yield this.root
  }
  /**
   * @template [E=never]
   * @param {API.Link} link
   * @param {E} [fallback]
   * @returns {API.Receipt|E}
   */
  get(link, fallback) {
    const receipts = this.root.data['ucanto/message@7.0.0'].report || {}
    const receipt = receipts[`${link}`]
    if (receipt) {
      return Receipt.view({ root: receipt, blocks: this.store })
    } else {
      return fallback !== undefined
        ? fallback
        : panic(`Message does not include receipt for ${link}`)
    }
  }

  get invocationLinks() {
    return this.root.data['ucanto/message@7.0.0'].execute || []
  }

  get invocations() {
    let invocations = this._invocations
    if (!invocations) {
      invocations = this.invocationLinks.map(link => {
        return Invocation.view({ root: link, blocks: this.store })
      })
    }

    return invocations
  }

  get receipts() {
    let receipts = this._receipts
    if (!receipts) {
      receipts = new Map()
      const report = this.root.data['ucanto/message@7.0.0'].report || {}
      for (const [key, link] of Object.entries(report)) {
        const receipt = Receipt.view({ root: link, blocks: this.store })
        receipts.set(`${receipt.ran.link()}`, receipt)
      }
    }

    return receipts
  }
}

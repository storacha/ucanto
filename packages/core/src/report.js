import * as API from '@ucanto/interface'
import * as DAG from './dag.js'
import * as Receipt from './receipt.js'

export const builder = () => new ReportBuilder()

/**
 * @template T
 * @template U
 * @param {object} source
 * @param {API.Link<API.ReportModel<T>>} source.root
 * @param {Map<string, API.Block>} source.blocks
 * @param {U} [fallback=never]
 * @returns {API.Report<T>|U}
 */
export const view = ({ root, blocks }, fallback) => {
  const block = DAG.get(root, blocks, null)
  if (block) {
    const root = {
      data: DAG.CBOR.decode(block.bytes),
      ...block,
    }

    return new Report({ root, store: blocks })
  } else {
    return fallback || DAG.notFound(root)
  }
}

/**
 * @template T
 * @implements {API.ReportBuilder<T>}
 */
class ReportBuilder {
  /**
   * @param {Map<API.ToString<API.Link<API.InstructionModel>>, API.Receipt>} receipts
   * @param {Map<string, API.Block>} store
   */
  constructor(receipts = new Map(), store = new Map()) {
    this.receipts = receipts
    this.store = store
  }
  /**
   * @param {API.Link} link
   * @param {API.Receipt} receipt
   */
  set(link, receipt) {
    this.receipts.set(`${link}`, receipt)
  }

  entries() {
    return this.receipts.entries()
  }
  /**
   * @param {API.BuildOptions} options
   * @returns {Promise<API.Report<T>>}
   */
  async buildIPLDView({ encoder = DAG.CBOR, hasher = DAG.sha256 } = {}) {
    /** @type {API.ReportModel<T>} */
    const report = { receipts: {} }
    for (const [key, receipt] of this.entries()) {
      for (const block of receipt.iterateIPLDBlocks()) {
        this.store.set(block.cid.toString(), block)
      }
      report.receipts[key] = receipt.root.cid
    }

    return new Report({
      root: await DAG.writeInto(report, this.store, {
        codec: encoder,
        hasher,
      }),
      store: this.store,
    })
  }

  build() {
    return this.buildIPLDView()
  }
}

/**
 * @template T
 * @implements {API.Report<T>}
 */
export class Report {
  /**
   * @param {object} source
   * @param {Required<API.Block<API.ReportModel<T>>>} source.root
   * @param {Map<string, API.Block>} source.store
   */
  constructor({ root, store }) {
    this.root = root
    this.store = store
  }
  /**
   * @template [E=never]
   * @param {API.Link} link
   * @param {E} fallback
   * @returns {API.Receipt|E}
   */
  get(link, fallback) {
    const root = this.root.data.receipts[`${link}`]
    if (root == null) {
      return fallback === undefined ? DAG.notFound(link) : fallback
    }
    return Receipt.view({ root, blocks: this.store }, fallback)
  }
  toIPLDView() {
    return this
  }
  *iterateIPLDBlocks() {
    for (const root of Object.values(this.root.data.receipts)) {
      const receipt = Receipt.view({ root, blocks: this.store })
      yield* receipt.iterateIPLDBlocks()
    }

    yield this.root
  }
}

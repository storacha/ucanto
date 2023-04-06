import * as API from '@ucanto/interface'
import { CBOR, Receipt, Invocation, sha256 } from './lib.js'
import * as DAG from './dag.js'

/**
 * @param {object} source
 * @param {API.ServiceInvocation[]} source.invocations
 */
export const createWorkflow = ({ invocations }) => {
  const builder = new WorkflowBuilder({ invocations, store: new Map() })
  return builder.buildIPLDView()
}

class WorkflowBuilder {
  /**
   * @param {object} source
   * @param {API.ServiceInvocation[]} source.invocations
   * @param {Map<string, API.Block>} source.store
   */
  constructor({ invocations, store }) {
    this.invocations = invocations
    this.store = store
  }
  /**
   * @param {API.ServiceInvocation} invocation
   */
  addInvocation(invocation) {
    this.invocations.push(invocation)
  }
  /**
   *
   * @param {API.BuildOptions} options
   */
  async buildIPLDView({ encoder = CBOR, hasher = sha256 } = {}) {
    const workflow = []
    for (const builder of this.invocations) {
      const invocation = await builder.buildIPLDView({ encoder, hasher })
      DAG.addEveryInto(invocation.iterateIPLDBlocks(), this.store)
      workflow.push(invocation.root.cid)
    }

    return new Workflow({
      root: await DAG.writeInto(
        {
          'ucanto/workflow@0.1': workflow,
        },
        this.store,
        { codec: encoder, hasher }
      ),
      store: this.store,
    })
  }
}

/**
 * @template {Record<string, any>} Service
 * @template {API.Capability} C
 * @template {API.Tuple<API.ServiceInvocation<C, Service> & API.Invocation>} I
 * @implements {API.Workflow<I>}
 */
class Workflow {
  /**
   * @param {object} source
   * @param {Required<API.Block<{'ucanto/workflow@0.1': API.WorkflowModel}>>} source.root
   * @param {Map<string, API.Block>} source.store
   */
  constructor({ root, store }) {
    this.root = root
    this.store = store
  }
  toIPLDView() {
    return this
  }

  get invocations() {
    const invocations = []
    // const workflow = DAG.when('ucanto/workflow@0.1', this.root.data)
    for (const root of this.root.data['ucanto/workflow@0.1']) {
      invocations.push(Invocation.view({ root, blocks: this.store }))
    }

    return /** @type {I} */ (invocations)
  }
  *iterateIPLDBlocks() {
    for (const invocation of this.invocations) {
      yield* invocation.iterateIPLDBlocks()
    }

    yield this.root
  }

  /**
   * @param {API.ServerView<Service>} executor
   * @returns {Promise<API.Report<API.InferWorkflowReceipts<I, Service>>>}
   */
  async execute(executor) {
    const report = createReportBuilder()
    await Promise.all(
      this.invocations.map(async invocation => {
        const receipt = await executor.run(invocation)
        report.add(
          // @ts-expect-error - link to delegation not instruction
          invocation.link(),
          receipt
        )
      })
    )

    return /** @type {API.Report<API.InferWorkflowReceipts<I, Service>} */ (
      await report.buildIPLDView()
    )
  }
}

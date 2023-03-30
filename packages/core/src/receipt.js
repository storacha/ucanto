import * as API from '@ucanto/interface'
import * as Outcome from './receipt/outcome.js'
import * as DID from '@ipld/dag-ucan/did'
import * as Signature from '@ipld/dag-ucan/signature'
import * as DAG from './dag.js'

export { Outcome }

/**
 * @param {object} input
 * @param {API.Link} input.root
 * @param {Map<string, API.Block>} input.blocks
 */
export const view = ({ root, blocks }) => {
  const block = DAG.decodeFrom(root, blocks)
  const outcome = Outcome.view({ root: block.data.ocm, blocks })

  return new Receipt({ root: block, store: blocks, outcome })
}

/**
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran - Invocation this is a receipt of.
 * @template {API.SigAlg} [SigAlg=API.SigAlg]
 * @implements {API.Receipt<Ok, Error, Ran, SigAlg>}
 */
class Receipt {
  /**
   * @param {object} input
   * @param {Required<API.Block<API.ReceiptModel<Ok, Error, Ran>>>} input.root
   * @param {API.Outcome<Ok, Error, Ran>} input.outcome
   * @param {Map<string, API.Block>} input.store
   * @param {API.Signature<API.Link<API.OutcomeModel<Ok, Error, Ran>>, SigAlg>} [input.signature]
   */
  constructor({ root, store, outcome, signature }) {
    this.store = store

    this.root = root
    this.outcome = outcome
    this._signature = signature
  }

  get issuer() {
    return this.outcome.issuer
  }

  get ran() {
    return this.outcome.ran
  }
  get proofs() {
    return this.outcome.proofs
  }

  buildIPLDView() {
    return this
  }
  /**
   * @returns {IterableIterator<API.Block>}
   */
  *iterateIPLDBlocks() {
    yield* DAG.iterate(this.outcome)

    yield this.root
  }

  get out() {
    return this.outcome.out
  }

  get fx() {
    return this.outcome.fx
  }

  get meta() {
    return this.outcome.meta
  }

  get signature() {
    const signature = this._signature
    if (signature) {
      return signature
    } else {
      const signature =
        /** @type {API.Signature<API.Link<API.OutcomeModel<Ok, Error, Ran>>, SigAlg>} */ (
          Signature.view(this.root.data.sig)
        )
      this._signature = signature
      return signature
    }
  }
}

const NOFX = Object.freeze({ fork: Object.freeze([]) })

/**
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @template {API.SigAlg} SigAlg
 * @param {object} options
 * @param {API.Signer<API.DID, SigAlg>} options.issuer
 * @param {Ran|ReturnType<Ran['link']>} options.ran
 * @param {API.ReceiptResult<Ok, Error>} options.result
 * @param {API.EffectsModel} [options.fx]
 * @param {API.Proof[]} [options.proofs]
 * @param {Record<string, unknown>} [options.meta]
 * @returns {Promise<API.Receipt<Ok, Error, Ran, SigAlg>>}
 */
export const issue = async ({
  issuer,
  result,
  ran,
  proofs = [],
  meta = {},
  fx = NOFX,
}) => {
  const store = DAG.createStore()

  // copy invocation blocks int
  DAG.addEveryInto(DAG.iterate(ran), store)

  // copy proof blocks into store
  for (const proof of proofs) {
    DAG.addEveryInto(DAG.iterate(proof), store)
  }

  const { cid } = await DAG.encodeInto(
    {
      ran: /** @type {ReturnType<Ran['link']>} */ (ran.link()),
      out: result,
      fx,
      meta,
      iss: issuer.did(),
      prf: proofs.map(p => p.link()),
    },
    store
  )

  const outcome = Outcome.view({ root: cid, blocks: store })
  /** @type {API.Signature<API.Link<API.OutcomeModel<Ok, Error, Ran>>, SigAlg>} */
  const signature = await issuer.sign(outcome.root.cid.bytes)

  /** @type {API.ReceiptModel<Ok, Error, Ran>} */
  const model = {
    ocm: outcome.root.cid,
    sig: signature,
  }
  const root = await DAG.encodeInto(model, store)

  return new Receipt({
    root,
    outcome,
    store,
    signature,
  })
}

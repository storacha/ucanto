import * as API from '@ucanto/interface'
import * as Invocation from '../invocation.js'
import { Delegation, DID } from '../lib.js'
import * as DAG from '../dag.js'

/**
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @param {object} source
 * @param {API.Link<API.OutcomeModel<Ok, Error, Ran>>} source.root
 * @param {Map<string, API.Block>} source.blocks
 * @returns {API.Outcome<Ok, Error, Ran>}
 */
export const view = ({ root, blocks }) => {
  return new Outcome({
    root: DAG.decodeFrom(root, blocks),
    store: blocks,
  })
}

/**
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @implements {API.Outcome<Ok, Error, Ran>}
 * @implements {API.IPLDView<API.OutcomeModel<Ok, Error, Ran>>}
 */
export class Outcome {
  /**
   *
   * @param {object} source
   * @param {Required<API.Block<API.OutcomeModel<Ok, Error, Ran>>>} source.root
   * @param {Map<string, API.Block>} source.store
   *
   */
  constructor({ root, store }) {
    this.root = root
    this.store = store
  }
  get model() {
    return this.root.data
  }

  link() {
    return this.root.cid
  }

  buildIPLDView() {
    return this
  }

  *iterateIPLDBlocks() {
    yield* DAG.iterate(this.ran)

    const { fork, join } = this.fx
    for (const concurrent of fork) {
      yield* DAG.iterate(concurrent)
    }

    if (join) {
      yield* DAG.iterate(join)
    }

    for (const proof of this.proofs) {
      yield* DAG.iterate(proof)
    }

    yield this.root
  }
  /**
   * @returns {Ran|ReturnType<Ran['link']>}
   */
  get ran() {
    const ran = this._ran
    if (!ran) {
      const ran = Invocation.embed({ root: this.model.ran, blocks: this.store })
      this._ran = ran
      return ran
    } else {
      return ran
    }
  }
  get proofs() {
    const proofs = this._proofs
    if (proofs) {
      return proofs
    } else {
      const { store: blocks, model } = this
      const proofs = []
      if (model.prf) {
        for (const link of model.prf) {
          const root = blocks.get(link.toString())
          if (root) {
            proofs.push(Delegation.create({ root, blocks: blocks }))
          } else {
            proofs.push(link)
          }
        }
      }

      this._proofs = proofs
      return proofs
    }
  }
  get meta() {
    return this.model.meta
  }
  get issuer() {
    const issuer = this._issuer
    if (issuer) {
      return issuer
    } else if (this.model.iss) {
      const issuer = DID.parse(this.model.iss)
      this._issuer = issuer
      return issuer
    }
  }

  get out() {
    return this.model.out
  }

  get fx() {
    return this.model.fx
  }
}

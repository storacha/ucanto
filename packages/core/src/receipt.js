import * as API from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'
import * as Invocation from './invocation.js'
import * as Delegation from './delegation.js'
import * as Signature from '@ipld/dag-ucan/signature'
import * as DAG from './dag.js'
import * as CBOR from './cbor.js'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @template [E=never]
 * @param {object} input
 * @param {API.Link<API.ReceiptModel<Ok, Error, Ran>>} input.root
 * @param {DAG.BlockStore} input.blocks
 * @param {E} [fallback]
 */
export const view = ({ root, blocks }, fallback) => {
  const block = DAG.get(root, blocks, null)
  if (block == null) {
    return fallback !== undefined ? fallback : DAG.notFound(root)
  }
  const data = CBOR.decode(block.bytes)

  return new Receipt({ root: { ...block, data }, store: blocks })
}

/**
 * Represents a UCAN invocation receipt view over some block store e.g. in
 * memory CAR. It incrementally decodes proofs, ran invocation etc. on access
 * which reduces overhead but potentially defers errors if references blocks
 * do not conform to the expected IPLD schema.
 *
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @template {API.SigAlg} [SigAlg=API.SigAlg]
 * @implements {API.Receipt<Ok, Error, Ran, SigAlg>}
 */
class Receipt {
  /**
   * @param {object} input
   * @param {Required<API.Block<API.ReceiptModel<Ok, Error, Ran>>>} input.root
   * @param {DAG.BlockStore} input.store
   * @param {API.Meta} [input.meta]
   * @param {Ran|ReturnType<Ran['link']>} [input.ran]
   * @param {API.EffectsModel} [input.fx]
   * @param {API.SignatureView<API.OutcomeModel<Ok, Error, Ran>, SigAlg>} [input.signature]
   * @param {API.UCAN.Principal} [input.issuer]
   * @param {API.Proof[]} [input.proofs]
   */
  constructor({ root, store, ran, issuer, signature, proofs }) {
    this.store = store

    this.root = root
    this._ran = ran

    // Field is materialized on demand when `fx` getter is first accessed.
    /** @type {API.Effects|undefined} */
    this._fx = undefined
    this._signature = signature
    this._proofs = proofs
    this._issuer = issuer
  }

  /**
   * @returns {Ran|ReturnType<Ran['link']>}
   */
  get ran() {
    const ran = this._ran
    if (!ran) {
      const ran = /** @type {Ran} */ (
        Invocation.view(
          {
            root: this.root.data.ocm.ran,
            blocks: this.store,
          },
          this.root.data.ocm.ran
        )
      )
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
      const { store, root } = this
      const { prf } = root.data.ocm
      const proofs = []
      if (prf) {
        for (const link of prf) {
          const proof = Delegation.view({ root: link, blocks: store }, link)
          proofs.push(proof)
        }
      }

      this._proofs = proofs
      return proofs
    }
  }
  link() {
    return this.root.cid
  }
  get meta() {
    return this.root.data.ocm.meta
  }
  get issuer() {
    const issuer = this._issuer
    if (issuer) {
      return issuer
    } else {
      const { iss } = this.root.data.ocm
      if (iss) {
        const issuer = DID.parse(iss)
        this._issuer = issuer
        return issuer
      }
    }
  }

  get out() {
    return this.root.data.ocm.out
  }

  get fx() {
    let fx = this._fx
    if (!fx) {
      const { store: blocks } = this
      const { fork, join } = this.root.data.ocm.fx

      fx = {
        fork: fork.map(root => Invocation.view({ root, blocks }, root)),
      }

      if (join) {
        fx.join = Invocation.view({ root: join, blocks }, join)
      }

      this._fx = fx
    }
    return fx
  }

  get signature() {
    const signature = this._signature
    if (signature) {
      return signature
    } else {
      const signature =
        /** @type {API.SignatureView<API.OutcomeModel<Ok, Error, Ran>, SigAlg>} */ (
          Signature.view(this.root.data.sig)
        )
      this._signature = signature
      return signature
    }
  }

  /**
   * @param {API.Crypto.Verifier} signingPrincipal
   */
  verifySignature(signingPrincipal) {
    return this.signature.verify(
      signingPrincipal,
      CBOR.encode(this.root.data.ocm)
    )
  }

  buildIPLDView() {
    return this
  }

  *iterateIPLDBlocks() {
    const { ran, fx, proofs, root } = this

    yield* DAG.iterate(ran)

    for (const fork of fx.fork) {
      yield* DAG.iterate(fork)
    }

    if (fx.join) {
      yield* DAG.iterate(fx.join)
    }

    for (const proof of proofs) {
      yield* DAG.iterate(proof)
    }

    yield root
  }
}

/**
 * Represents a receipt builder that can be used to create a receipt that later
 * can be encoded into desired IPLD codec and hasher. In the future we may make
 * this an incremental builder so you could set some fields later on.
 *
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @template {API.SigAlg} SigAlg
 * @implements {API.IPLDViewBuilder<API.Receipt<Ok, Error, Ran, SigAlg>>}
 */
class ReceptBuilder {
  /**
   * @param {object} options
   * @param {API.Signer<API.DID, SigAlg>} options.issuer
   * @param {Ran|ReturnType<Ran['link']>} options.ran
   * @param {API.Result<Ok, Error>} options.result
   * @param {API.Effects} [options.fx]
   * @param {API.Proof[]} [options.proofs]
   * @param {Record<string, unknown>} [options.meta]
   */
  constructor({ issuer, result, ran, fx = NOFX, proofs = [], meta = {} }) {
    this.issuer = issuer
    this.result = result
    this.ran = ran
    this.fx = fx
    this.proofs = proofs
    this.meta = meta
  }
  async buildIPLDView({ hasher = sha256, codec = CBOR } = {}) {
    const store = DAG.createStore()

    // copy invocation blocks int
    DAG.addEveryInto(DAG.iterate(this.ran), store)

    // copy proof blocks into store
    const prf = []
    for (const proof of this.proofs) {
      DAG.addEveryInto(DAG.iterate(proof), store)
      prf.push(proof.link())
    }

    // copy blocks from the embedded fx
    /** @type {{fork: API.Run[], join?:API.Run}}  */
    const fx = { fork: [] }
    for (const fork of this.fx.fork) {
      DAG.addEveryInto(DAG.iterate(fork), store)
      fx.fork.push(fork.link())
    }

    if (this.fx.join) {
      DAG.addEveryInto(DAG.iterate(this.fx.join), store)
      fx.join = this.fx.join.link()
    }

    /** @type {API.OutcomeModel<Ok, Error, Ran>} */
    const outcome = {
      ran: /** @type {ReturnType<Ran['link']>} */ (this.ran.link()),
      out: this.result,
      fx,
      meta: this.meta,
      iss: this.issuer.did(),
      prf,
    }

    const signature = await this.issuer.sign(CBOR.encode(outcome))

    /** @type {API.ReceiptModel<Ok, Error, Ran>} */
    const model = {
      ocm: outcome,
      sig: signature,
    }
    const root = await DAG.writeInto(model, store, {
      hasher,
      codec,
    })

    return new Receipt({
      root,
      store,
      signature,
      proofs: this.proofs,
      ran: this.ran,
    })
  }
}

const NOFX = Object.freeze({ fork: Object.freeze([]) })

/**
 * Creates a receipt in CBOR with sha256 hashed links.
 *
 * @template {{}} Ok
 * @template {{}} Error
 * @template {API.Invocation} Ran
 * @template {API.SigAlg} SigAlg
 * @param {object} options
 * @param {API.Signer<API.DID, SigAlg>} options.issuer
 * @param {Ran|ReturnType<Ran['link']>} options.ran
 * @param {API.Result<Ok, Error>} options.result
 * @param {API.Effects} [options.fx]
 * @param {API.Proof[]} [options.proofs]
 * @param {Record<string, unknown>} [options.meta]
 * @returns {Promise<API.Receipt<Ok, Error, Ran, SigAlg>>}
 */
export const issue = options => new ReceptBuilder(options).buildIPLDView()

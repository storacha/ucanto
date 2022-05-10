import { isLink } from "@ucanto/core"
import * as API from "@ucanto/interface"
import * as UCAN from "@ipld/dag-ucan"

/**
 * Creates a new signed token with a given `options.issuer`. If expiration is
 * not set it defaults to 30 seconds from now. Returns UCAN in primary - IPLD
 * representation.
 *
 * @template {number} A
 * @template {UCAN.Capability} C
 * @param {API.DelegationOptions<C, A>} input
 * @returns {Promise<API.Delegation<C>>}
 */

export const delegate = async ({ issuer, audience, proofs = [], ...input }) => {
  const data = await UCAN.issue({
    ...input,
    issuer,
    audience,
    proofs: proofs.map(proof => (isLink(proof) ? proof : proof.cid)),
  })
  const { cid, bytes } = await UCAN.write(data)

  return new Delegation(
    issuer.authority,
    audience,
    { cid, bytes, data },
    proofs
  )
}

/**
 * Represents view over the UCAN DAG. Can be instantiated with a `root` block
 * and a map of optional proof blocks.
 *
 * @template {UCAN.Capability} Capability
 * @implements {API.Delegation<Capability>}
 */
export class Delegation {
  /**
   * @param {API.Authority} issuer
   * @param {API.Authority} audience
   * @param {object} root
   * @param {UCAN.Proof<Capability>} root.cid
   * @param {UCAN.ByteView<UCAN.UCAN<Capability>>} root.bytes
   * @param {UCAN.View<Capability>} root.data
   * @param {API.Proof[]} proofs
   */
  constructor(issuer, audience, root, proofs) {
    this.root = root
    this.issuer = issuer
    this.audience = audience
    this.proofs = proofs
    Object.defineProperties(this, {
      blocks: {
        enumerable: false,
      },
    })
  }

  get version() {
    return this.root.data.version
  }
  get signature() {
    return this.root.data.signature
  }
  get cid() {
    return this.root.cid
  }
  get bytes() {
    return this.root.bytes
  }
  get data() {
    return this.root.data
  }
  /**
   * @returns {IterableIterator<API.Block>}
   */
  *export() {
    for (const proof of this.proofs) {
      if (!isLink(proof)) {
        yield* proof.export()
      }
    }
    yield this.root
  }

  /**
   * @returns {Capability[]}
   */
  get capabilities() {
    return this.data.capabilities
  }

  /**
   * @returns {number}
   */
  get expiration() {
    return this.data.expiration
  }

  /**
   * @returns {undefined|number}
   */
  get notBefore() {
    return this.data.notBefore
  }

  /**
   * @returns {undefined|string}
   */

  get nonce() {
    return this.data.nonce
  }

  /**
   * @returns {UCAN.Fact[]}
   */
  get facts() {
    return this.data.facts
  }
}

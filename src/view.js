import * as API from "./api.js"
import * as UCAN from "@ipld/dag-ucan"
import * as DID from "@ipld/dag-ucan/src/did.js"
import { exportDelegation } from "./transport/packet.js"

/**
 * @template {API.Capability} Capability
 * @implements {API.IssuedInvocationView<Capability>}
 */
export class IssuedInvocation {
  /**
   * @param {object} data
   * @param {API.Issuer} data.issuer
   * @param {API.Agent} data.audience
   * @param {Capability} data.capability
   * @param {API.Proof[]} [data.proofs]
   */
  constructor({ issuer, audience, capability, proofs = [] }) {
    /** @readonly */
    this.issuer = issuer
    /** @readonly */
    this.audience = audience
    /** @readonly */
    this.proofs = proofs

    /** @readonly */
    this.capability = capability
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.Connection<Service>} connection
   * @returns {API.ExecuteInvocation<Capability, Service>}
   */
  execute(connection) {
    throw new Error("Not implemented")
  }
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
   * @param {object} root
   * @param {UCAN.Proof<Capability>} root.cid
   * @param {UCAN.ByteView<UCAN.UCAN<Capability>>} root.bytes
   * @param {UCAN.View<Capability>} [root.data]
   * @param {Map<string, API.Transport.Block<Capability>>} blocks
   */
  constructor({ cid, bytes, data = UCAN.decode(bytes) }, blocks = new Map()) {
    this.root = { cid, bytes, data }
    this.blocks = blocks
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
   * @returns {IterableIterator<API.Transport.Block<Capability>>}
   */
  export() {
    return exportDelegation(this)
  }

  get proofs() {
    /** @type {API.Proof<Capability>[]} */
    const proofs = []
    const { blocks, data } = this
    for (const proof of data.proofs) {
      const block = blocks.get(proof.toString())
      if (block) {
        proofs.push(new Delegation(block, this.blocks))
      } else {
        proofs.push(/** @type {UCAN.Proof<Capability>} */ (proof))
      }
    }

    Object.defineProperty(this, "proofs", { value: proofs })
    return proofs
  }
  get issuer() {
    return this.data.issuer
  }
  get audience() {
    return this.data.audience
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

/**
 * Represents invocation view of the UCAN DAG.
 *
 * @template {API.Capability} Capability
 * @implements {API.InvocationView<Capability>}
 * @extends {Delegation<Capability>}
 */
export class Invocation extends Delegation {
  get capability() {
    return /** @type {Capability} */ (this.capabilities[0])
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.Connection<Service>} connection
   * @returns {API.ExecuteInvocation<Capability, Service>}
   */
  execute(connection) {
    throw new Error("Not implemented")
  }
}

/**
 * @implements {API.Agent}
 */

export class Agent {
  /**
   * @param {API.UCAN.DID} value
   */
  constructor(value) {
    this.value = value
  }
  did() {
    return this.value
  }
}

/**
 * @template {API.IssuedInvocation[]|API.Invocation[]} Invocations
 * @implements {API.Batch<Invocations>}
 */
export class Batch {
  /**
   * @param {Invocations} invocations
   * @param {Map<string, API.UCAN.View>} [delegations]
   */
  constructor(invocations, delegations = new Map()) {
    this.invocations = invocations
    this.delegations = delegations
  }

  /**
   * @template {API.BatchInvocationService<Invocations>} Service
   * @param {API.Connection<Service>} connection
   * @returns {API.ExecuteBatchInvocation<Invocations, Service>}
   */
  execute(connection) {
    throw new Error("Not implemented")
  }
}

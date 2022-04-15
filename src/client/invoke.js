import * as API from '../api.js'
import * as UCAN from '@ipld/dag-ucan'
import * as Transport from './transport/api.js'
import { isLink } from './transport/util.js'
export * from '../api.js'

/**
 * @template {UCAN.Capability} Capability
 * @param {API.IssuedInvocation<Capability>} invocation
 * @return {API.IssuedInvocationView<Capability>}
 */
export const invoke = ({ issuer, audience, proofs, capability }) =>
  new IssuedInvocationView({
    issuer,
    audience,
    capability,
    proofs,
  })

/**
 * @template {API.IssuedInvocation[]} Invocations
 * @param {Invocations} invocations
 * @returns {API.Batch<Invocations>}
 */

export const batch = (...invocations) => new Batch(invocations)

/**
 * @template {UCAN.Capability} Capability
 * @param {API.Invocation<Capability>} invocation
 * @returns {[Capability]}
 */
export const capabilities = ({ issuer, audience, proofs, ...capability }) => [
  /** @type {any} */ (capability),
]

/**
 * @template {API.Invocation} Action
 * @param {Action} action
 * @returns {API.Proof[]}
 */
export const proofs = (action) => action.proofs || []

/**
 * @template {UCAN.Capability} Capability
 * @implements {API.IssuedInvocationView<Capability>}
 */
class IssuedInvocationView {
  /**
   * @param {object} data
   * @param {UCAN.Issuer} data.issuer
   * @param {UCAN.Audience} data.audience
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
    throw new Error('Not implemented')
  }
}

/**
 * @template {UCAN.Capability} Capability
 * @implements {API.InvocationView<Capability>}
 */
class DelegatedInvocationView {
  /**
   * @param {object} data
   * @param {UCAN.Audience} data.issuer
   * @param {UCAN.Audience} data.audience
   * @param {Capability} data.capability
   * @param {Map<string, UCAN.View>} data.delegations
   * @param {UCAN.Proof[]} data.evidence
   */
  constructor({ issuer, audience, capability, evidence }) {
    /** @readonly */
    this.issuer = issuer
    /** @readonly */
    this.audience = audience

    /** @readonly */
    this.delegations = this.delegations

    /** @readonly */
    this.evidence = evidence

    /** @readonly */
    this.capability = capability
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.Connection<Service>} connection
   * @returns {API.ExecuteInvocation<Capability, Service>}
   */
  execute(connection) {
    throw new Error('Not implemented')
  }
}

/**
 * @template {API.IssuedInvocation[]|API.Invocation[]} Invocations
 * @implements {API.Batch<Invocations>}
 */
class Batch {
  /**
   * @param {Invocations} invocations
   * @param {Map<string, UCAN.View>} [delegations]
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
    throw new Error('Not implemented')
  }
}

/**
 * Packs multiple invocations into set of ucan and proof blocks.
 *
 * @template {API.IssuedInvocation[]} Invocations
 * @param {API.Batch<Invocations>} batch
 * @returns {Promise<Transport.Packet<Invocations>>}
 */
export const pack = async (batch) => {
  const invocations = []
  const delegations = new Map()
  for (const invocation of batch.invocations) {
    const { links, blocks } = await writeProofs(invocation.proofs || [])
    const { issuer, audience } = invocation

    for (const block of blocks) {
      delegations.set(block.cid.toString(), block)
    }

    const ucan = await UCAN.issue({
      issuer,
      audience: audience.did(),
      capabilities: [invocation.capability],
      proofs: links,
    })

    const { cid, bytes } = await UCAN.write(ucan)
    invocations.push({ cid, bytes, data: ucan })
  }

  return { invocations, delegations }
}

/**
 * @template {API.Invocation[]} Invocations
 * @param {Transport.Packet<Invocations>} bundle
 * @returns {Promise<API.Batch<Invocations>>}
 */
export const unpack = async (bundle) => {
  /** @type {Invocations} */
  const invocations = /** @type {any} */ ([])
  const delegations = new Map()
  for (const [key, block] of bundle.delegations.entries()) {
    delegations.set(key, block.data)
  }

  for (const block of bundle.invocations) {
    const { issuer, audience, proofs, capabilities } = block.data
    const [capability] = capabilities

    const invocation = new DelegatedInvocationView({
      issuer: toAudience(issuer),
      audience: toAudience(audience),
      evidence: proofs,
      capability,
      delegations,
    })
    invocations.push(invocation)
  }

  return new Batch(invocations, delegations)
}

/**
 *
 * @param {UCAN.DID} did
 * @returns {UCAN.Audience}
 */
const toAudience = (did) => ({ did: () => did })
/**
 * @param {API.Proof[]} proofs
 * @returns {Promise<{ blocks: Transport.Block[], links: UCAN.Proof[] }>}
 */
const writeProofs = async (proofs) => {
  const links = []
  const blocks = []
  for (const proof of proofs) {
    if (isLink(proof)) {
      links.push(proof)
    } else {
      const { cid, bytes } = await UCAN.write(proof)
      links.push(cid)
      blocks.push({
        cid,
        bytes,
        data: proof,
      })
    }
  }
  return { links, blocks }
}

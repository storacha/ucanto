import * as API from '../../api.js'
import * as Invoke from '../invoke.js'
import * as UCAN from '@ipld/dag-ucan'
import * as Transport from './api.js'

/**
 * Packs multiple invocations into set of ucan and proof blocks.
 *
 * @template {API.Invocation<UCAN.Capability, UCAN.Issuer>[]} Invocations
 * @param {Invocations} input
 * @returns {Promise<Transport.Bundle<Invocations>>}
 */
export const pack = async (input) => {
  const invocations = []
  const delegations = new Map()
  for (const invocation of input) {
    const capabilities = Invoke.capabilities(invocation)
    const { links, blocks } = await writeProofs(Invoke.proofs(invocation))
    const { issuer, audience } = invocation

    for (const block of blocks) {
      delegations.set(block.cid.toString(), block)
    }

    const ucan = await UCAN.issue({
      issuer,
      audience: audience.did(),
      capabilities,
      proofs: links,
    })

    const { cid, bytes } = await UCAN.write(ucan)
    invocations.push({ cid, bytes, data: ucan })
  }

  return { invocations, delegations }
}

/**
 * @template {API.Invocation<UCAN.Capability, UCAN.Audience>[]} Invocations
 * @param {Transport.Bundle<Invocations>} bundle
 * @returns {Invocations}
 */
export const upnack = ({ invocations, delegations }) =>
  /** @type {any} */ (
    invocations.map(
      ({ data }) =>
        new Invocation(
          data,
          new Map(
            [...delegations.entries()].map(([key, { data }]) => [key, data])
          )
        )
    )
  )

/**
 * @template {UCAN.Capability} C
 * @implements {API.Invocation<C, UCAN.Audience>}
 */
class Invocation {
  /**
   * @param {UCAN.View<C>} ucan
   * @param {Map<string, UCAN.View<C>>} delegations
   */
  constructor(ucan, delegations) {
    this.ucan = ucan
    this.delegations = delegations

    const [capability] = ucan.capabilities
  }
  get can() {
    return this.ucan.capabilities[0].can
  }
  get issuer() {
    return this.ucan.issuer
  }
}

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

/**
 * Type predicate returns true if value is the link.
 *
 * @param {unknown} value
 * @returns {value is UCAN.Link}
 */

export const isLink = (value) =>
  value != null && /** @type {{asCID: unknown}} */ (value).asCID === value

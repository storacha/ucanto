import * as API from '@ucanto/interface'
import { isDelegation, UCAN } from '@ucanto/core'
import {
  UnavailableProof,
  InvalidAudience,
  Expired,
  NotValidBefore,
  InvalidSignature,
  DelegationError,
  Failure,
  MalformedCapability,
  li,
} from './error.js'

export { Failure, UnavailableProof, MalformedCapability }

export { capability } from './capability.js'
export * from './schema.js'
export * as Schema from './schema.js'

/**
 * @param {UCAN.Link} proof
 */
const unavailable = proof => new UnavailableProof(proof)

/**
 * @param {Required<API.ProofResolver>} config
 * @param {API.Match<unknown, API.Match>} match
 */

const resolveMatch = async (match, config) => {
  const promises = []
  const includes = new Set()
  for (const source of match.source) {
    const id = source.delegation.cid.toString()
    if (!includes.has(id)) {
      promises.push(await resolveSources(source, config))
    }
  }
  const groups = await Promise.all(promises)
  const sources = []
  const errors = []
  for (const group of groups) {
    sources.push(...group.sources)
    errors.push(...group.errors)
  }

  return { sources, errors }
}

/**
 * @param {API.Delegation} delegation
 * @param {Required<API.ProofResolver>} config
 */
const resolveProofs = async (delegation, config) => {
  /** @type {API.Result<API.Delegation, API.UnavailableProof>[]} */
  const proofs = []
  const promises = []
  for (const [index, proof] of delegation.proofs.entries()) {
    if (!isDelegation(proof)) {
      promises.push(
        new Promise(async resolve => {
          try {
            proofs[index] = await config.resolve(proof)
          } catch (error) {
            proofs[index] = new UnavailableProof(
              proof,
              /** @type {Error} */ (error)
            )
          }
          resolve(null)
        })
      )
    } else {
      proofs[index] = proof
    }
  }

  await Promise.all(promises)
  return proofs
}

/**
 * @param {API.Source} from
 * @param {Required<API.ProofResolver>} config
 * @return {Promise<{sources:API.Source[], errors:ProofError[]}>}
 */
const resolveSources = async ({ delegation }, config) => {
  const errors = []
  const sources = []
  // resolve all the proofs that can be side-loaded
  const proofs = await resolveProofs(delegation, config)
  for (const [index, proof] of proofs.entries()) {
    // if proof can not be side-loaded save a proof errors.
    if (proof.error) {
      errors.push(new ProofError(proof.link, index, proof))
    } else {
      // If proof does not delegate to a matchig audience save an proof error.
      if (delegation.issuer.did() !== proof.audience.did()) {
        errors.push(
          new ProofError(
            proof.cid,
            index,
            new InvalidAudience(delegation.issuer, proof)
          )
        )
      } else {
        // If proof is not valid (expired, not active yet or has incorrect
        // signature) save a correspondig proof error.
        const validation = await validate(proof, config)
        if (validation.error) {
          errors.push(new ProofError(proof.cid, index, validation))
        } else {
          // otherwise create source objects for it's capabilities, so we could
          // track which proof in which capability the are from.
          for (const capability of proof.capabilities) {
            sources.push({
              capability,
              delegation: proof,
              index,
            })
          }
        }
      }
    }
  }

  return { sources, errors }
}

/**
 * @param {API.ParsedCapability} capability
 * @param {API.DID} issuer
 */
const isSelfIssued = (capability, issuer) => capability.with === issuer

/**
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {R} URI
 * @template {API.Caveats} C
 * @param {API.Invocation<API.Capability<A, URI, API.InferCaveats<C>>>} invocation
 * @param {API.ValidationOptions<API.ParsedCapability<A, R, API.InferCaveats<C>>>} config
 * @returns {Promise<API.Result<Authorization<API.ParsedCapability<A, R, API.InferCaveats<C>>>, API.Unauthorized>>}
 */
export const access = async (
  invocation,
  { canIssue = isSelfIssued, principal, resolve = unavailable, capability }
) => {
  const config = { canIssue, resolve, principal, capability }

  const claim = capability.match({
    capability: invocation.capabilities[0],
    delegation: invocation,
    index: 0,
  })

  if (claim.error) {
    return new Unauthorized(claim)
  }
  const check = await validate(invocation, config)
  if (check.error) {
    return new Unauthorized(check)
  }

  const match = claim.prune(config)
  if (match == null) {
    return new Authorization(claim, [])
  } else {
    const result = await authorize(match, config)
    if (result.error) {
      return new Unauthorized(result)
    } else {
      return new Authorization(claim, [result])
    }
  }
}

/**
 * @template {API.ParsedCapability} C
 */
class Authorization {
  /**
   * @param {API.Match<C>} match
   * @param {Authorization<API.ParsedCapability>[]} proofs
   */
  constructor(match, proofs) {
    this.match = match
    this.proofs = proofs
  }
  get capability() {
    return this.match.value
  }
  get delegation() {
    return this.match.source[0].delegation
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.delegation.audience
  }
}
/**
 * Verifies whether any of the delegated proofs grant give capabality.
 *
 * @template {API.ParsedCapability} C
 * @template {API.Match} Match
 * @param {Match} match
 * @param {Required<API.ValidationOptions<C>>} config
 * @returns {Promise<API.Result<Authorization<API.ParsedCapability>, API.InvalidClaim>>}
 */

export const authorize = async (match, config) => {
  // load proofs from all delegations
  const { sources, errors: invalidProofs } = await resolveMatch(match, config)

  const selection = match.select(sources)
  const { errors: delegationErrors, unknown: unknownCapaibilities } = selection

  const failedProofs = []
  for (const matched of selection.matches) {
    const selector = matched.prune(config)
    if (selector == null) {
      // @ts-expect-error - it may not be a parsed capability but rather a
      // group of capabilites but we can deal with that in the future.
      return new Authorization(matched, [])
    } else {
      const result = await authorize(selector, config)
      if (result.error) {
        failedProofs.push(result)
      } else {
        // @ts-expect-error - it may not be a parsed capability but rather a
        // group of capabilites but we can deal with that in the future.
        return new Authorization(matched, [result])
      }
    }
  }

  return new InvalidClaim({
    match,
    delegationErrors,
    unknownCapaibilities,
    invalidProofs,
    failedProofs,
  })
}

class ProofError extends Failure {
  /**
   * @param {API.UCANLink} proof
   * @param {number} index
   * @param {API.Failure} cause
   */
  constructor(proof, index, cause) {
    super()
    this.name = 'ProofError'
    this.proof = proof
    this.index = index
    this.cause = cause
  }
  describe() {
    return [
      `Can not derive from prf:${this.index} - ${this.proof} because:`,
      li(this.cause.message),
    ].join(`\n`)
  }
}

/**
 * @implements {API.InvalidClaim}
 */
class InvalidClaim extends Failure {
  /**
   * @param {{
   * match: API.Match
   * delegationErrors: API.DelegationError[]
   * unknownCapaibilities: API.Capability[]
   * invalidProofs: ProofError[]
   * failedProofs: API.InvalidClaim[]
   * }} info
   */
  constructor(info) {
    super()
    this.info = info
    /** @type {"InvalidClaim"} */
    this.name = 'InvalidClaim'
  }
  get issuer() {
    return this.delegation.issuer
  }
  get capability() {
    return this.info.match.value
  }
  get delegation() {
    return this.info.match.source[0].delegation
  }
  describe() {
    const errors = [
      ...this.info.failedProofs.map(error => li(error.message)),
      ...this.info.delegationErrors.map(error => li(error.message)),
      ...this.info.invalidProofs.map(error => li(error.message)),
    ]

    const unknown = this.info.unknownCapaibilities.map(c =>
      li(JSON.stringify(c))
    )

    return [
      `Claimed capability ${this.info.match} is invalid`,
      li(`Capability can not be (self) issued by '${this.issuer.did()}'`),
      ...(errors.length > 0 ? errors : [li(`Delegated capability not found`)]),
      ...(unknown.length > 0
        ? [li(`Encountered unknown capabilities\n${unknown.join('\n')}`)]
        : []),
    ].join('\n')
  }
}

/**
 * @implements {API.Unauthorized}
 */
class Unauthorized extends Failure {
  /**
   * @param {API.InvalidCapability | API.InvalidProof | API.InvalidClaim} cause
   */
  constructor(cause) {
    super()
    /** @type {"Unauthorized"} */
    this.name = 'Unauthorized'
    this.cause = cause
  }
  get message() {
    return this.cause.message
  }
  toJSON() {
    const { error, name, message, cause, stack } = this
    return { error, name, message, cause, stack }
  }
}

/**
 * @template {API.Delegation} T
 * @param {T} delegation
 * @param {API.PrincipalOptions} config
 * @returns {Promise<API.Result<T, API.InvalidProof>>}
 */
const validate = async (delegation, config) => {
  if (UCAN.isExpired(delegation.data)) {
    return new Expired(
      /** @type {API.Delegation & {expiration: number}} */ (delegation)
    )
  }

  if (UCAN.isTooEarly(delegation.data)) {
    return new NotValidBefore(
      /** @type {API.Delegation & {notBefore: number}} */ (delegation)
    )
  }

  return await verifySignature(delegation, config)
}

/**
 * @template {API.Delegation} T
 * @param {T} delegation
 * @param {API.PrincipalOptions} config
 * @returns {Promise<API.Result<T, API.InvalidSignature>>}
 */
const verifySignature = async (delegation, { principal }) => {
  const issuer = principal.parse(delegation.issuer.did())
  const valid = await UCAN.verifySignature(delegation.data, issuer)

  return valid ? delegation : new InvalidSignature(delegation)
}

export { InvalidAudience }

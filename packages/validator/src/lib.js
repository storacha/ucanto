import * as API from '@ucanto/interface'
import { isDelegation, UCAN } from '@ucanto/core'
import { capability } from './capability.js'
import * as Schema from './schema.js'
import {
  UnavailableProof,
  InvalidAudience,
  Expired,
  NotValidBefore,
  InvalidSignature,
  DelegationError,
  Failure,
  MalformedCapability,
  DIDKeyResolutionError,
  li,
} from './error.js'

export {
  Failure,
  UnavailableProof,
  MalformedCapability,
  DIDKeyResolutionError as DIDResolutionError,
}

export { capability } from './capability.js'
import { DID } from './schema.js'
export * from './schema.js'
export { Schema }

/**
 * @param {UCAN.Link} proof
 */
const unavailable = proof => new UnavailableProof(proof)

/**
 *
 * @param {UCAN.DID} did
 * @returns {API.DIDKeyResolutionError}
 */
const failDIDKeyResolution = did => new DIDKeyResolutionError(did)

/**
 * @param {Required<API.ClaimOptions>} config
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
 * @param {API.Proof[]} proofs
 * @param {Required<API.ProofResolver>} config
 */
const resolveProofs = async (proofs, config) => {
  /** @type {API.Result<API.Delegation, API.UnavailableProof>[]} */
  const delegations = []
  const promises = []
  for (const [index, proof] of proofs.entries()) {
    if (!isDelegation(proof)) {
      promises.push(
        new Promise(async resolve => {
          try {
            delegations[index] = await config.resolve(proof)
          } catch (error) {
            delegations[index] = new UnavailableProof(
              proof,
              /** @type {Error} */ (error)
            )
          }
          resolve(null)
        })
      )
    } else {
      delegations[index] = proof
    }
  }

  await Promise.all(promises)
  return delegations
}

/**
 * @param {API.Source} from
 * @param {Required<API.ClaimOptions>} config
 * @return {Promise<{sources:API.Source[], errors:ProofError[]}>}
 */
const resolveSources = async ({ delegation }, config) => {
  const errors = []
  const sources = []
  // resolve all the proofs that can be side-loaded
  const proofs = await resolveProofs(delegation.proofs, config)
  for (const [index, proof] of proofs.entries()) {
    // if proof can not be side-loaded save a proof errors.
    if (proof.error) {
      errors.push(new ProofError(proof.link, index, proof))
    } else {
      // If proof does not delegate to a matching audience save an proof error.
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
        // signature) save a corresponding proof error.
        const validation = await validate(proof, config)
        if (validation.error) {
          errors.push(new ProofError(proof.cid, index, validation))
        } else {
          // otherwise create source objects for it's capabilities, so we could
          // track which proof in which capability the are from.
          for (const capability of proof.capabilities) {
            sources.push(
              /** @type {API.Source} */ ({
                capability,
                delegation: proof,
                index,
              })
            )
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
 * Finds a valid path in a proof chain of the given `invocation` by exploring
 * every possible option. On success an `Authorization` object is returned that
 * illustrates the valid path. If no valid path is found `Unauthorized` error
 * is returned detailing all explored paths and where they proved to fail.
 *
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {R} URI
 * @template {API.Caveats} C
 * @param {API.Invocation<API.Capability<A, URI, C>>} invocation
 * @param {API.ValidationOptions<API.ParsedCapability<A, R, C>>} options
 * @returns {Promise<API.Result<Authorization<API.ParsedCapability<A, R, C>>, API.Unauthorized>>}
 */
export const access = async (invocation, { capability, ...config }) =>
  claim(capability, [invocation], config)

/**
 * Attempts to find a valid proof chain for the claimed `capability` given set
 * of `proofs`. On success an `Authorization` object with detailed proof chain
 * is returned and on failure `Unauthorized` error is returned with details on
 * paths explored and why they have failed.
 *
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @param {API.CapabilityParser<API.Match<API.ParsedCapability<A, R, C>>>} capability
 * @param {API.Proof[]} proofs
 * @param {API.ClaimOptions} config
 * @returns {Promise<API.Result<Authorization<API.ParsedCapability<A, R, C>>, API.Unauthorized>>}
 */
export const claim = async (
  capability,
  proofs,
  {
    authority,
    principal,
    resolveDIDKey = failDIDKeyResolution,
    canIssue = isSelfIssued,
    resolve = unavailable,
  }
) => {
  const config = {
    canIssue,
    resolve,
    principal,
    capability,
    authority,
    resolveDIDKey,
  }

  const invalidProofs = []

  /** @type {API.Source[]} */
  const sources = []
  for (const proof of await resolveProofs(proofs, config)) {
    const delegation = proof.error ? proof : await validate(proof, config)

    if (!delegation.error) {
      for (const [index, capability] of delegation.capabilities.entries()) {
        sources.push(
          /** @type {API.Source} */ ({
            capability,
            delegation,
            index,
          })
        )
      }
    } else {
      invalidProofs.push(delegation)
    }
  }
  // look for the matching capability
  const selection = capability.select(sources)

  const { errors: delegationErrors, unknown: unknownCapabilities } = selection
  const failedProofs = []
  for (const matched of selection.matches) {
    const selector = matched.prune(config)
    if (selector == null) {
      return new Authorization(matched, [])
    } else {
      const result = await authorize(selector, config)
      if (result.error) {
        failedProofs.push(result)
      } else {
        return new Authorization(matched, [result])
      }
    }
  }

  return new Unauthorized({
    capability,
    delegationErrors,
    unknownCapabilities,
    invalidProofs,
    failedProofs,
  })
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
 * Verifies whether any of the delegated proofs grant give capability.
 *
 * @template {API.Match} Match
 * @param {Match} match
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<Authorization<API.ParsedCapability>, API.InvalidClaim>>}
 */

export const authorize = async (match, config) => {
  // load proofs from all delegations
  const { sources, errors: invalidProofs } = await resolveMatch(match, config)

  const selection = match.select(sources)
  const { errors: delegationErrors, unknown: unknownCapabilities } = selection

  const failedProofs = []
  for (const matched of selection.matches) {
    const selector = matched.prune(config)
    if (selector == null) {
      // @ts-expect-error - it may not be a parsed capability but rather a
      // group of capabilities but we can deal with that in the future.
      return new Authorization(matched, [])
    } else {
      const result = await authorize(selector, config)
      if (result.error) {
        failedProofs.push(result)
      } else {
        // @ts-expect-error - it may not be a parsed capability but rather a
        // group of capabilities but we can deal with that in the future.
        return new Authorization(matched, [result])
      }
    }
  }

  return new InvalidClaim({
    match,
    delegationErrors,
    unknownCapabilities,
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
      `Capability can not be derived from prf:${this.index} - ${this.proof} because:`,
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
   * unknownCapabilities: API.Capability[]
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
  get delegation() {
    return this.info.match.source[0].delegation
  }
  describe() {
    const errors = [
      ...this.info.failedProofs.map(error => li(error.message)),
      ...this.info.delegationErrors.map(error => li(error.message)),
      ...this.info.invalidProofs.map(error => li(error.message)),
    ]

    const unknown = this.info.unknownCapabilities.map(c =>
      li(JSON.stringify(c))
    )

    return [
      `Capability ${this.info.match} is not authorized because:`,
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
   * @param {{
   * capability: API.CapabilityParser
   * delegationErrors: API.DelegationError[]
   * unknownCapabilities: API.Capability[]
   * invalidProofs: API.InvalidProof[]
   * failedProofs: API.InvalidClaim[]
   * }} cause
   */
  constructor({
    capability,
    delegationErrors,
    unknownCapabilities,
    invalidProofs,
    failedProofs,
  }) {
    super()
    /** @type {"Unauthorized"} */
    this.name = 'Unauthorized'
    this.capability = capability
    this.delegationErrors = delegationErrors
    this.unknownCapabilities = unknownCapabilities
    this.invalidProofs = invalidProofs
    this.failedProofs = failedProofs
  }

  describe() {
    const errors = [
      ...this.failedProofs.map(error => li(error.message)),
      ...this.delegationErrors.map(error => li(error.message)),
      ...this.invalidProofs.map(error => li(error.message)),
    ]

    const unknown = this.unknownCapabilities.map(c => li(JSON.stringify(c)))

    return [
      `Claim ${this.capability} is not authorized`,
      ...(errors.length > 0
        ? errors
        : [li(`No matching delegated capability found`)]),
      ...(unknown.length > 0
        ? [li(`Encountered unknown capabilities\n${unknown.join('\n')}`)]
        : []),
    ].join('\n')
  }
  toJSON() {
    const { error, name, message, stack } = this
    return { error, name, message, stack }
  }
}

/**
 * @template {API.Delegation} T
 * @param {T} delegation
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<T, API.InvalidProof|API.DIDKeyResolutionError>>}
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
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<T, API.InvalidSignature|API.DIDKeyResolutionError>>}
 */
const verifySignature = async (delegation, config) => {
  const did = delegation.issuer.did()
  const verifier = await resolveVerifier(did, delegation, config)

  if (verifier.error) {
    return verifier
  }

  const valid = await UCAN.verifySignature(delegation.data, verifier)
  return valid ? delegation : new InvalidSignature(delegation, verifier)
}

/**
 * @param {API.DID} did
 * @param {API.Delegation} delegation
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<API.Verifier, API.DIDKeyResolutionError>>}
 */
const resolveVerifier = async (did, delegation, config) => {
  if (did === config.authority.did()) {
    return config.authority
  } else if (did.startsWith('did:key:')) {
    return config.principal.parse(did)
  } else {
    // First we attempt to resolve key from the embedded proofs
    const local = await resolveDIDFromProofs(did, delegation, config)
    const result = !local?.error
      ? local
      : // If failed to resolve because there is an invalid proof propagate error
      (local?.cause?.failedProofs?.length || 0) > 0
      ? local
      : // otherwise either use resolved key or if not found attempt to resolve
        // did externally
        await config.resolveDIDKey(did)
    return result.error ? result : config.principal.parse(result).withDID(did)
  }
}

/**
 * @param {API.DID} did
 * @param {API.Delegation} delegation
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<API.DIDKey, API.DIDKeyResolutionError>>}
 */
const resolveDIDFromProofs = async (did, delegation, config) => {
  const update = Top.derive({
    to: capability({
      with: Schema.literal(config.authority.did()),
      can: './update',
      nb: Schema.struct({ key: DID.match({ method: 'key' }) }),
    }),
    derives: equalWith,
  })

  const result = await claim(update, delegation.proofs, config)
  return !result.error
    ? result.match.value.nb.key
    : new DIDKeyResolutionError(did, result)
}

const Top = capability({
  can: '*',
  with: DID,
})

/**
 * @param {API.Capability} to
 * @param {API.Capability} from
 */

const equalWith = (to, from) =>
  to.with === from.with ||
  new Failure(`Claimed ${to.with} can not be derived from ${from.with}`)

export { InvalidAudience }

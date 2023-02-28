import * as API from '@ucanto/interface'
import { isDelegation, Delegation, UCAN } from '@ucanto/core'
import { capability } from './capability.js'
import * as Schema from './schema.js'
import {
  UnavailableProof,
  InvalidAudience,
  Expired,
  NotValidBefore,
  InvalidSignature,
  SessionEscalation,
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
 * Takes `proofs` from the delegation which may contain `Delegation` or a link
 * to one and attempts to resolve links by side loading them. Returns set of
 * resolved `Delegation`s and errors for the proofs that could not be resolved.
 *
 * @param {API.Proof[]} proofs
 * @param {Required<API.ProofResolver>} config
 */
const resolveProofs = async (proofs, config) => {
  /** @type {API.Delegation[]} */
  const delegations = []
  /** @type {API.UnavailableProof[]} */
  const errors = []
  const promises = []
  for (const proof of proofs) {
    // If it is a delegation we can just add it to the resolved set.
    if (isDelegation(proof)) {
      delegations.push(proof)
    }
    // otherwise we attempt to resolve the link asynchronously. To avoid doing
    // sequential requests we create promise for each link and then wait for
    // all of them at the end.
    else {
      promises.push(
        new Promise(async resolve => {
          // config.resolve is not supposed to throw, but we catch it just in
          // case it does and consider proof resolution failed.
          try {
            const result = await config.resolve(proof)
            if (result.error) {
              errors.push(result)
            } else {
              delegations.push(result)
            }
          } catch (error) {
            errors.push(
              new UnavailableProof(proof, /** @type {Error} */ (error))
            )
          }

          // we don't care about the result, we just need to signal that we are
          // done with this promise.
          resolve(null)
        })
      )
    }
  }

  // Wait for all the promises to resolve. At this point we have collected all
  // the resolved delegations and errors.
  await Promise.all(promises)
  return { delegations, errors }
}

/**
 * Takes a delegation source and attempts to resolve all the linked proofs.
 *
 * @param {API.Source} from
 * @param {Required<API.ClaimOptions>} config
 * @return {Promise<{sources:API.Source[], errors:ProofError[]}>}
 */
const resolveSources = async ({ delegation }, config) => {
  const errors = []
  const sources = []
  const proofs = []
  // First we attempt to resolve all the linked proofs.
  const { delegations, errors: failedProofs } = await resolveProofs(
    delegation.proofs,
    config
  )

  // All the proofs that failed to resolve are saved as proof errors.
  for (const error of failedProofs) {
    errors.push(new ProofError(error.link, error))
  }

  // All the proofs that resolved are checked for principal alignment. Ones that
  // do not align are saved as proof errors.
  for (const proof of delegations) {
    // If proof does not delegate to a matching audience save an proof error.
    if (delegation.issuer.did() !== proof.audience.did()) {
      errors.push(
        new ProofError(proof.cid, new InvalidAudience(delegation.issuer, proof))
      )
    } else {
      proofs.push(proof)
    }
  }

  // In the second pass we attempt to proofs that were resolved and are aligned.
  for (const proof of proofs) {
    // If proof is not valid (expired, not active yet or has incorrect
    // signature) save a corresponding proof error.
    const validation = await validate(proof, proofs, config)
    if (validation.error) {
      errors.push(new ProofError(proof.cid, validation))
    } else {
      // otherwise create source objects for it's capabilities, so we could
      // track which proof in which capability the are from.
      for (const capability of proof.capabilities) {
        sources.push(
          /** @type {API.Source} */ ({
            capability,
            delegation: proof,
          })
        )
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

  const { delegations, errors } = await resolveProofs(proofs, config)
  invalidProofs.push(...errors)

  for (const proof of delegations) {
    // Validate each proof if valid add ech capability to the list of sources.
    // otherwise collect the error.
    const delegation = await validate(proof, delegations, config)
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
   * @param {API.Failure} cause
   */
  constructor(proof, cause) {
    super()
    this.name = 'ProofError'
    this.proof = proof
    this.cause = cause
  }
  describe() {
    return [
      `Capability can not be derived from prf:${this.proof} because:`,
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
 * Validate a delegation to check it is within the time bound and that it is
 * authorized by the issuer.
 *
 * @template {API.Delegation} T
 * @param {T} delegation
 * @param {API.Delegation[]} proofs
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<T, API.InvalidProof|API.SessionEscalation|API.DIDKeyResolutionError>>}
 */
const validate = async (delegation, proofs, config) => {
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

  return await verifyAuthorization(delegation, proofs, config)
}

/**
 * Verifies that delegation has been authorized by the issuer. If issued by the
 * did:key principal checks that the signature is valid. If issued by the root
 * authority checks that the signature is valid. If issued by the principal
 * identified by other DID method attempts to resolve a valid `ucan/attest`
 * attestation from the authority, if attestation is not found falls back to
 * resolving did:key for the issuer and verifying its signature.
 *
 * @template {API.Delegation} T
 * @param {T} delegation
 * @param {API.Delegation[]} proofs
 * @param {Required<API.ClaimOptions>} config
 * @returns {Promise<API.Result<T, API.InvalidSignature|API.SessionEscalation|API.DIDKeyResolutionError>>}
 */
const verifyAuthorization = async (delegation, proofs, config) => {
  const issuer = delegation.issuer.did()
  // If the issuer is a did:key we just verify a signature
  if (issuer.startsWith('did:key:')) {
    return verifySignature(delegation, config.principal.parse(issuer))
  }
  // If the issuer is the root authority we use authority itself to verify
  else if (issuer === config.authority.did()) {
    return verifySignature(delegation, config.authority)
  } else {
    // If issuer is not a did:key principal nor configured authority, we
    // attempt to resolve embedded authorization session from the authority.
    const session = await verifySession(delegation, proofs, config)
    // If we have valid session we consider authorization valid
    if (!session.error) {
      return delegation
    } else if (session.failedProofs.length > 0) {
      return new SessionEscalation({ delegation, cause: session })
    }
    // Otherwise we try to resolve did:key from the DID instead
    // and use that to verify the signature
    else {
      const verifier = await config.resolveDIDKey(issuer)
      if (verifier.error) {
        return verifier
      } else {
        return verifySignature(
          delegation,
          config.principal.parse(verifier).withDID(issuer)
        )
      }
    }
  }
}

/**
 * @template {API.Delegation} T
 * @param {T} delegation
 * @param {API.Verifier} verifier
 * @returns {Promise<API.Result<T, API.InvalidSignature|API.DIDKeyResolutionError>>}
 */
const verifySignature = async (delegation, verifier) => {
  const valid = await UCAN.verifySignature(delegation.data, verifier)
  return valid ? delegation : new InvalidSignature(delegation, verifier)
}

/**
 * Attempts to find an authorization session - an `ucan/attest` capability
 * delegation where `with` matches `config.authority` and `nb.proof`
 * matches given delegation.
 * @see https://github.com/web3-storage/specs/blob/feat/auth+account/w3-session.md#authorization-session
 *
 * @param {API.Delegation} delegation
 * @param {API.Delegation[]} proofs
 * @param {Required<API.ClaimOptions>} config
 */
const verifySession = async (delegation, proofs, config) => {
  // Create a schema that will match an authorization for this exact delegation
  const attestation = capability({
    with: Schema.literal(config.authority.did()),
    can: 'ucan/attest',
    nb: Schema.struct({
      proof: Schema.link(delegation.cid),
    }),
  })

  return await claim(
    attestation,
    // We omit the delegation otherwise we may end up in an infinite loop
    proofs.filter(proof => proof != delegation),
    config
  )
}

export { InvalidAudience }

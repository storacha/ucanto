import * as API from "./api.js"
import * as UCAN from "@ipld/dag-ucan"
import { isLink, Delegation } from "@ucanto/core"
import { the } from "./util.js"
import {
  UnavailableProof,
  InvalidClaim,
  InvalidAudience,
  InvalidEvidence,
  Expired,
  NotValidBefore,
  InvalidSignature,
  NoEvidence,
  DelegationError,
  Failure,
  li,
} from "./error.js"

const empty = () => []

/**
 * @param {UCAN.Proof} proof
 */
const unavailable = proof => new UnavailableProof(proof)

// /**
//  * @template I, O
//  * @param {(input:I) => O} execute
//  * @param {I} input
//  * @param {Map<string, any>} cache
//  * @param {string} [key]
//  * @returns {O}
//  */
// const withCache = (execute, input, cache, key = String(input)) => {
//   if (cache.has(key)) {
//     return /** @type {O} */ (cache.get(key))
//   } else {
//     const output = execute(input)
//     cache.set(key, output)
//     return output
//   }
// }

// /**
//  * @template {API.ParsedCapability} C
//  * @param {API.Delegation} invocation
//  * @param {API.ValidationOptions<C>} config
//  * @returns {Promise<API.Result<API.Access<C>, API.DenyAccess<C>>>}
//  */
// export const access = async (
//   invocation,
//   { canIssue, my = empty, resolve = unavailable, capability }
// ) => {
//   // First we validate time bounds and signature ensuring that invocation
//   // is valid.
//   const delegation = await validate(invocation)
//   if (delegation.error) {
//     return delegation
//   }

//   // Next we parse capability, if failed terminate early with an error
//   const match = capability.match({
//     capability: delegation.capabilities[0],
//     index: 0,
//     delegation: invocation,
//   })

//   if (match.error) {
//     return match
//   }

//   const authorization = await authorize(match, delegation, {
//     canIssue,
//     my,
//     resolve,
//     capability,
//   })

//   if (authorization.error) {
//     return authorization
//   }

//   return new Access(match.value, delegation, authorization)
// }

// /**
//  * Verifies whether any of the delegated proofs grant give capabality.
//  *
//  * @template {API.ParsedCapability} C
//  * @param {API.Match<C, API.Match>} match
//  * @param {API.Delegation} delegation
//  * @param {Required<API.ValidationOptions<C>>} config
//  * @returns {API.Await<API.Result<API.Authorization<C>, API.DelegationError>>}
//  */

// const authorize = (match, delegation, config) => {
//   // If we got this far we have a valid token and a capabality which is either
//   // self-issued or delegated. If issuer can issue this capability we grant
//   // access without looking for a proof.
//   if (config.canIssue(match.value, delegation.issuer.did())) {
//     return new Authorization([match.value], delegation)
//   } else {
//     return claim(match, delegation, config)
//   }
// }

/**
 * @template {API.ParsedCapability} C
 * @param {Required<API.ValidationOptions<C>>} config
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
 * @template {API.ParsedCapability} C
 * @param {API.Delegation} delegation
 * @param {Required<API.ValidationOptions<C>>} config
 */
const resolveProofs = async (delegation, config) => {
  /** @type {API.Result<API.Delegation, API.UnavailableProof>[]} */
  const proofs = []
  const promises = []
  for (const [index, proof] of delegation.proofs.entries()) {
    if (isLink(proof)) {
      promises.push(
        Promise.resolve(config.resolve(proof)).then(
          result => {
            proofs[index] = result
          },
          () => {
            proofs[index] = new UnavailableProof(proof)
          }
        )
      )
    } else {
      proofs[index] = proof
    }
  }

  await Promise.all(promises)
  return proofs
}

/**
 * @template {API.ParsedCapability} C
 * @param {API.Source} from
 * @param {Required<API.ValidationOptions<C>>} config
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
          for (const capability of iterateCapabilities(proof, config)) {
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
 * @template {API.ParsedCapability} C
 * @param {API.Invocation} delegation
 * @param {API.ValidationOptions<C>} config
 * @returns {Promise<API.Result<Authorization<C>, API.InvalidCapability|API.InvalidProof|FailedProof>>}
 */
export const access = async (
  delegation,
  { canIssue, authority, my = empty, resolve = unavailable, capability }
) => {
  const config = { canIssue, my, resolve, authority, capability }

  const claim = capability.match({
    capability: delegation.capabilities[0],
    delegation,
    index: 0,
  })

  if (claim.error) {
    return claim
  }
  const check = await validate(delegation, config)
  if (check.error) {
    return check
  }

  const match = claim.prune(config)
  if (match == null) {
    return new Authorization(claim, [])
  } else {
    const result = await auth(match, config)
    if (result.error) {
      return result
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
 * @returns {Promise<API.Result<Authorization<API.ParsedCapability>, FailedProof>>}
 */

export const auth = async (match, config) => {
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
      const result = await auth(selector, config)
      if (result.error) {
        failedProofs.push(result)
      } else {
        // @ts-expect-error - it may not be a parsed capability but rather a
        // group of capabilites but we can deal with that in the future.
        return new Authorization(matched, [result])
      }
    }
  }

  return new FailedProof({
    match,
    delegationErrors,
    unknownCapaibilities,
    invalidProofs,
    failedProofs,
  })
}

class ProofError extends Failure {
  /**
   * @param {API.Link} proof
   * @param {number} index
   * @param {API.Problem} cause
   */
  constructor(proof, index, cause) {
    super()
    this.name = "ProofError"
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

// /**
//  * @template {API.Match} Match
//  * @param {Match} match
//  * @returns {Promise<API.Result<Match, FailedMatch>>}
//  */
// const validateMatch = async match => {
//   for (const proof of match.proofs) {
//     const result = await validate(proof)
//     if (result.error) {
//       return new FailedMatch(match, result)
//     }
//   }
//   return match
// }

class FailedMatch extends Failure {
  /**
   * @param {API.Match} match
   * @param {API.InvalidProof} cause
   */
  constructor(match, cause) {
    super()
    this.match = match
    this.cause = cause
  }
}

class FailedProof extends Failure {
  /**
   * @param {{
   * match: API.Match
   * delegationErrors: API.DelegationError[]
   * unknownCapaibilities: API.Capability[]
   * invalidProofs: ProofError[]
   * failedProofs: FailedProof[]
   * }} info
   */
  constructor(info) {
    super()
    this.info = info
    this.name = "InvalidClaim"
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
        ? [li(`Encountered unknown capabilities\n${unknown.join("\n")}`)]
        : []),
    ].join("\n")
  }
}

// /**
//  * Verifies whether any of the delegated proofs grant give capabality.
//  *
//  * @template {API.ParsedCapability} C
//  * @param {API.Match<C, API.Match>} match
//  * @param {API.Delegation} delegation
//  * @param {Required<API.ValidationOptions<C>>} config
//  * @returns {Promise<API.Result<API.Authorization<C>, API.DelegationError>>}
//  */

// const claim = (match, delegation, config) =>
//   new Promise(async resolve => {
//     /** @type {API.ProofError<C>[]} */
//     const causes = []
//     const { issuer } = delegation
//     // We evaluate claim against every proof concurrently, first succesful one
//     // will resolve the promise. Failures are added to errors.
//     const promises = delegation.proofs.map((proof, index) =>
//       prove(issuer, match, proof, config).then(result => {
//         if (result.error) {
//           causes[index] = result.error
//         } else {
//           resolve(result)
//         }
//       })
//     )

//     // When all promises resolve we resolve with `InvalidClaim` containing
//     // errors for each evaluated proof. Note that if any of the proof succeeded
//     // it would have resolved promise already so this will be a noop.
//     await Promise.all(promises)
//     // new DelegationError(proofs, match)
//     resolve(new InvalidClaim(match.value, delegation, causes))
//   })

// /**
//  * @template {API.ParsedCapability} C
//  * @param {API.Authority} issuer
//  * @param {API.Match<C, API.Match>} match
//  * @param {API.Proof} proof
//  * @param {Required<API.ValidationOptions<C>>} config
//  * @returns {Promise<API.Result<API.Authorization<C>, API.ProofError<C>>>}
//  */

// const prove = async (issuer, match, proof, config) => {
//   const delegation = isLink(proof)
//     ? await config.resolve(proof)
//     : /** @type {API.Delegation & {error?:undefined}} */ (proof)

//   if (delegation.error) {
//     return delegation
//   }

//   const signature = await validate(delegation)
//   if (signature.error) {
//     return signature
//   }

//   if (delegation.audience.did() !== issuer.did()) {
//     return new InvalidAudience(issuer, delegation)
//   } else {
//     const selection = match.select([...iterateCapabilities(delegation, config)])
//     if (selection.matches.length === 0) {
//       return new NoEvidence(
//         match.value,
//         delegation,
//         selection.errors,
//         selection.unknown
//       )
//     }

//     // here we consider each possible path sequentially although we could
//     // run those concurrently instead.
//     const errors = []

//     // we need to ensure that each capability here is valid
//     for (const match of selection.matches) {
//       const auth = await verify(match, delegation, config)
//       if (auth.error) {
//         errors.push(auth.error)
//       } else {
//         return auth
//       }
//     }

//     return new InvalidClaim(capability, delegation, [
//       ...selection.errors,
//       ...errors,
//     ])
//   }
// }

// /**
//  * @template {{}} C
//  * @param {API.Evidence<C>} evidence
//  * @param {API.Delegation} proof
//  * @param {Required<API.ValidationOptions<C>>} config
//  * @returns {Promise<API.Result<API.Authorization<C>, API.InvalidEvidence<C>>>}
//  */
// const verify = async (evidence, proof, config) => {
//   const results = evidence.capabilities.map($ => authorize($, proof, config))
//   const invalid = []
//   const proofs = []
//   for (const result of await Promise.all(results)) {
//     if (result.error) {
//       invalid.push(result)
//     } else {
//       proofs.push(result)
//     }
//   }

//   if (invalid.length === 0) {
//     return new Authorization(evidence.capabilities, proof, proofs)
//   } else {
//     return new InvalidEvidence(evidence, proof, invalid)
//   }
// }

const ALL = "*"

// /**
//  * @template C
//  * @implements {API.Authorization<C>}
//  */
// class Authorization {
//   /**
//    * @param {C[]} capabilities
//    * @param {API.Delegation} delegation
//    * @param {API.Authorization<C>[]} proofs
//    */
//   constructor(capabilities, delegation, proofs = []) {
//     this.capabilities = capabilities
//     this.delegation = delegation
//     this.proofs = proofs

//     Object.defineProperties(this, {
//       delegation: { enumerable: false },
//     })
//   }
//   get name() {
//     return the("Authorization")
//   }
//   get issuer() {
//     return this.delegation.issuer
//   }
//   get audience() {
//     return this.proofs.length === 0
//       ? this.delegation.issuer
//       : this.delegation.audience
//   }
// }

/**
 * @template {{}} C
 * @param {API.Delegation} delegation
 * @param {Required<API.ValidationOptions<C>>} options
 */
function* iterateCapabilities({ issuer, capabilities }, { my }) {
  const did = issuer.did()
  for (const capability of capabilities) {
    const uri = parseMyURI(capability.with, did) || parseAsURI(capability.with)
    const { can } = capability

    if (uri) {
      for (const capability of my(uri.did)) {
        if (
          capability.with.startsWith(uri.protocol) &&
          (can === ALL || capability.can === can)
        ) {
          yield capability
        }
      }
    } else {
      yield capability
    }
  }
}

const AS_PATTERN = /as:(.*):(.*)/
const MY = /my:(.*)/

/**
 * @param {string} uri
 * @returns {{did:API.DID, protocol:string}|null}
 */
const parseAsURI = uri => {
  const [, did, kind] = AS_PATTERN.exec(uri) || []
  return did != null && kind != null
    ? {
        did: /** @type {API.DID} */ (did),
        protocol: kind === ALL ? "" : `${kind}:`,
      }
    : null
}

/**
 * @param {string} uri
 * @param {API.DID} did
 */

const parseMyURI = (uri, did) => {
  const [, kind] = MY.exec(uri) || []
  return kind != null ? { did, protocol: kind === ALL ? "" : `${kind}:` } : null
}

/**
 * @param {API.Delegation} delegation
 * @param {API.ValidationOptions} config
 * @returns {Promise<API.Result<API.Delegation, API.InvalidProof>>}
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
 * @param {API.Delegation} delegation
 * @param {API.ValidationOptions} config
 * @returns {Promise<API.Result<API.Delegation, API.InvalidSignature>>}
 */
const verifySignature = async (delegation, { authority }) => {
  const issuer = authority.parse(delegation.issuer.did())
  const valid = await UCAN.verifySignature(delegation.data, issuer)

  return valid ? delegation : new InvalidSignature(delegation)
}

// /**
//  * @template C
//  * @implements {API.Access<C>}
//  */
// class Access {
//   /**
//    * @param {C} capability
//    * @param {API.Delegation} delegation
//    * @param {API.Authorization<C>} [proof]
//    */
//   constructor(
//     capability,
//     delegation,
//     proof = new Authorization([capability], delegation)
//   ) {
//     this.capability = capability
//     this.delegation = delegation
//     this.proof = proof
//     Object.defineProperties(this, {
//       delegation: { enumerable: false },
//     })
//   }
//   get name() {
//     return the("Access")
//   }
// }

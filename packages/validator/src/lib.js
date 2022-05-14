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
} from "./error.js"

const empty = () => []

/**
 * @param {UCAN.Proof} proof
 */
const unavailable = proof => new UnavailableProof(proof)

/**
 * @template I, O
 * @param {(input:I) => O} execute
 * @param {I} input
 * @param {Map<string, any>} cache
 * @param {string} [key]
 * @returns {O}
 */
const withCache = (execute, input, cache, key = String(input)) => {
  if (cache.has(key)) {
    return /** @type {O} */ (cache.get(key))
  } else {
    const output = execute(input)
    cache.set(key, output)
    return output
  }
}

/**
 * @template {{}} C
 * @param {API.Delegation} invocation
 * @param {API.ValidationOptions<C>} config
 * @returns {Promise<API.Result<API.Access<C>, API.DenyAccess<C>>>}
 */
export const access = async (
  invocation,
  { canIssue, my = empty, resolve = unavailable, parse, check }
) => {
  // First we validate time bounds and signature ensuring that invocation
  // is valid.
  const delegation = await validate(invocation)
  if (delegation.error) {
    return delegation.error
  }

  // Next we parse capability, if failed terminate early with an error
  const capabality = parse(delegation.capabilities[0])
  if (capabality.error) {
    return capabality.error
  }

  const authorization = await authorize(capabality, delegation, {
    canIssue,
    my,
    resolve,
    parse,
    check,
  })

  return authorization.error
    ? authorization.error
    : new Access(capabality, delegation, authorization)
}

/**
 * Verifies whether any of the delegated proofs grant give capabality.
 *
 * @template {{}} C
 * @param {C} capability
 * @param {API.Delegation} delegation
 * @param {Required<API.ValidationOptions<C>>} config
 * @returns {API.Await<API.Result<API.Authorization<C>, API.InvalidClaim<C>>>}
 */

const authorize = (capability, delegation, config) => {
  // If we got this far we have a valid token and a capabality which is either
  // self-issued or delegated. If issuer can issue this capability we grant
  // access without looking for a proof.
  if (config.canIssue(capability, delegation.issuer.did())) {
    return new Authorization([capability], delegation)
  } else {
    return claim(capability, delegation, config)
  }
}

/**
 * Verifies whether any of the delegated proofs grant give capabality.
 *
 * @template {{}} C
 * @param {C} capability
 * @param {API.Delegation} delegation
 * @param {Required<API.ValidationOptions<C>>} config
 * @returns {Promise<API.Result<API.Authorization<C>, API.InvalidClaim<C>>>}
 */

const claim = (capability, delegation, config) =>
  new Promise(async resolve => {
    /** @type {API.ProofError<C>[]} */
    const proofs = []
    const { issuer } = delegation
    // We evaluate claim against every proof concurrently, first succesful one
    // will resolve the promise. Failures are added to errors.
    const promises = delegation.proofs.map((proof, index) =>
      prove(issuer, capability, proof, config).then(result => {
        if (result.error) {
          proofs[index] = result.error
        } else {
          resolve(result)
        }
      })
    )

    // When all promises resolve we resolve with `InvalidClaim` containing
    // errors for each evaluated proof. Note that if any of the proof succeeded
    // it would have resolved promise already so this will be a noop.
    await Promise.all(promises)
    resolve(new InvalidClaim(capability, delegation, proofs))
  })

/**
 * @template {{}} C
 * @param {API.Authority} issuer
 * @param {C} capability
 * @param {API.Proof} proof
 * @param {Required<API.ValidationOptions<C>>} config
 * @returns {Promise<API.Result<API.Authorization<C>, API.ProofError<C>>>}
 */

const prove = async (issuer, capability, proof, config) => {
  const delegation = isLink(proof)
    ? await config.resolve(proof)
    : /** @type {API.Delegation & {error?:undefined}} */ (proof)

  if (delegation.error) {
    return delegation.error
  }

  const signature = await validate(delegation)
  if (signature.error) {
    return signature.error
  }

  if (delegation.audience.did() !== issuer.did()) {
    return new InvalidAudience(issuer, delegation)
  } else {
    const parsed = parseCapabilities(delegation, config)
    if (parsed.capabilities.length === 0) {
      return new NoEvidence(capability, delegation, parsed.errors)
    }

    const check = config.check(capability, parsed.capabilities)
    // TODO: wrap ClaimError into something else
    if (check.error) {
      return check.error
    }

    // here we consider each possible path sequentially although we could
    // run those concurrently instead.
    const errors = []

    // we need to ensure that each capability here is valid
    for (const evidence of check) {
      const auth = await verify(evidence, delegation, config)
      if (auth.error) {
        errors.push(auth.error)
      } else {
        return auth
      }
    }

    return new InvalidClaim(capability, delegation, errors)
  }
}

/**
 * @template {{}} C
 * @param {API.Evidence<C>} evidence
 * @param {API.Delegation} proof
 * @param {Required<API.ValidationOptions<C>>} config
 * @returns {Promise<API.Result<API.Authorization<C>, API.InvalidEvidence<C>>>}
 */
const verify = async (evidence, proof, config) => {
  const results = evidence.capabilities.map($ => authorize($, proof, config))
  const invalid = []
  const proofs = []
  for (const result of await Promise.all(results)) {
    if (result.error) {
      invalid.push(result.error)
    } else {
      proofs.push(result)
    }
  }

  if (invalid.length === 0) {
    return new Authorization(evidence.capabilities, proof, proofs)
  } else {
    return new InvalidEvidence(evidence, proof, invalid)
  }
}

const ALL = "*"

/**
 * @template C
 * @implements {API.Authorization<C>}
 */
class Authorization {
  /**
   * @param {C[]} capabilities
   * @param {API.Delegation} delegation
   * @param {API.Authorization<C>[]} proofs
   */
  constructor(capabilities, delegation, proofs = []) {
    this.capabilities = capabilities
    this.delegation = delegation
    this.proofs = proofs

    Object.defineProperties(this, {
      delegation: { enumerable: false },
    })
  }
  get name() {
    return the("Authorization")
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.proofs.length === 0
      ? this.delegation.issuer
      : this.delegation.audience
  }
}

/**
 * Takes delegation object and parses delegated capabilities with a given
 * configuration. Returns parsed `capabilities` and `errors` for capabilities
 * that could not be parsed.
 *
 * @template {{}} C
 * @param {API.Delegation} delegation
 * @param {Required<API.ValidationOptions<C>>} config
 * @returns {{capabilities:C[], errors:API.InvalidCapability[]}}
 */
const parseCapabilities = (delegation, config) => {
  const capabilities = []
  const errors = []
  for (const capability of iterateCapabilities(delegation, config)) {
    const result = config.parse(capability)
    if (result.error) {
      errors.push(result.error)
    } else {
      capabilities.push(result)
    }
  }

  return { capabilities, errors }
}

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
 * @returns {Promise<API.Result<API.Delegation, API.InvalidProof>>}
 */
const validate = async delegation => {
  if (UCAN.isExpired(delegation.data)) {
    return new Expired(
      /** @type {API.Delegation & {expiration: number}} */ (delegation)
    )
  } else if (UCAN.isTooEarly(delegation.data)) {
    return new NotValidBefore(
      /** @type {API.Delegation & {notBefore: number}} */ (delegation)
    )
  } else {
    return await verifySignature(delegation)
  }
}

/**
 * @param {API.Delegation} delegation
 * @returns {Promise<API.Result<API.Delegation, API.InvalidSignature>>}
 */
const verifySignature = async delegation => {
  const valid = await UCAN.verifySignature(delegation.data, delegation.issuer)

  return valid ? delegation : new InvalidSignature(delegation)
}

/**
 * @template C
 * @implements {API.Access<C>}
 */
class Access {
  /**
   * @param {C} capability
   * @param {API.Delegation} delegation
   * @param {API.Authorization<C>} [proof]
   */
  constructor(
    capability,
    delegation,
    proof = new Authorization([capability], delegation)
  ) {
    this.capability = capability
    this.delegation = delegation
    this.proof = proof
    Object.defineProperties(this, {
      delegation: { enumerable: false },
    })
  }
  get name() {
    return the("Access")
  }
}

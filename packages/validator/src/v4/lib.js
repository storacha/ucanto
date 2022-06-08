import * as API from "../v3/api.js"
import { entries, combine, intersection } from "../v3/util.js"
import * as UCAN from "@ipld/dag-ucan"
import {
  EscalatedCapability,
  MalformedCapability,
  UnknownCapability,
  NotValidBefore,
  InvalidSignature,
  Expired,
  DelegationError as MatchError,
  UnavailableProof,
} from "../error.js"
import { isLink, Delegation } from "@ucanto/core"
export * from "../v3/api.js"

/**
 * @template {API.Ability} [A=API.Ability]
 * @template {API.Caveats} [C={}]
 */
class ClaimedCapability {
  /**
   * @param {API.ParsedCapability<A, API.InferCaveats<C>>} capability
   * @param {API.Delegation} delegation
   * @param {API.Descriptor<A, C>} descriptor
   */
  constructor(capability, delegation, descriptor) {
    this.capabality = capability
    this.descriptor = descriptor
    this.delegation = delegation
  }
  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.SelectedCapability<API.ParsedCapability<A, API.InferCaveats<C>>>}
   */
  select(proofs) {
    const unknown = []
    const malformed = []
    const escalated = []
    const matched = []
    for (const proof of proofs) {
      for (const [index, capability] of proof.capabilities.entries()) {
        const result = parse(this, { delegation: proof, capability, index })
        if (result.error) {
          if (parse.name === "UnknownCapability") {
            unknown.push(result.capability)
          } else {
            malformed.push(result.capability)
          }
        } else {
          const derive = this.descriptor.derives(this.capabality, result)
          if (derive.error) {
            escalated.push(derive)
          } else {
            matched.push(result)
          }
        }
      }
    }

    return { unknown, malformed, escalated, matched }
  }
  /**
   * @param {API.ValidationOptions} options
   * @returns {Promise<API.Result<Authorization<API.ParsedCapability<A, API.InferCaveats<C>>>, AccessDenied<API.ParsedCapability<A, API.InferCaveats<C>>>>>}
   */
  async access(options) {
    const denied = []
    const unavailable = []
    const unknown = []
    const malformed = []

    const { capabality, delegation, descriptor } = this
    const result = await validate(delegation, options)
    if (result.error) {
      return new AccessDenied(capabality, { denied: [result] })
    }

    // self issued capability
    if (options.canIssue(capabality, delegation.issuer.did())) {
      return new Authorization(capabality, delegation)
    }

    for (const proof of delegation.proofs) {
      const delegation = await resolve(proof, options)
      if (delegation.error) {
        unavailable.push(delegation)
      } else {
        for (const capabality of delegation.capabilities) {
          const result = parse(this, capabality)
          if (result.error) {
            if (result.name === "UnknownCapability") {
              unknown.push(result.capability)
            } else {
              malformed.push(result.capability)
            }
          } else {
            const claim = new ClaimedCapability(result, delegation, descriptor)
            const auth = await claim.access(options)
            if (auth.error) {
              denied.push(auth)
            } else {
              return new Authorization(this.capabality, delegation, auth)
            }
          }
        }
      }
    }

    return new AccessDenied(capabality, {
      denied,
      unavailable,
      unknown,
      malformed,
    })
  }
}

/**
 * @template {API.Ability} [A=API.Ability]
 * @template {API.Caveats} [C={}]
 * @template {[API.CapabilitySelector, ...API.CapabilitySelector[]]} [From=[API.CapabilitySelector, ...API.CapabilitySelector[]]]
 */
class ClaimedDerivedCapability {
  /**
   * @param {API.ParsedCapability<A, API.InferCaveats<C>>} capability
   * @param {API.Delegation} delegation
   * @param {API.Descriptor<A, C>} descriptor
   * @param {From} from
   */
  constructor(capability, delegation, descriptor, from) {
    this.capability = capability
    this.delegation = delegation
    this.descriptor = descriptor
    this.from = from
    this.as = new ClaimedCapability(capability, delegation, descriptor)
  }
  /**
   * @param {API.Delegation[]} proofs
   */
  select(proofs) {
    const result = this.as.select(proofs)
    const data = []

    for (const selector of this.from) {
      const selected = selector.select(proofs)
      data.push(selected.matched)
    }

    const combined = combine(data).map(group => new ClaimedCapabilities(group))
  }
  /**
   * @param {API.ValidationOptions} options
   * @returns {Promise<API.Result<Authorization<API.ParsedCapability<A, API.InferCaveats<C>>>, AccessDenied<API.ParsedCapability<A, API.InferCaveats<C>>>>>}
   */
  async access(options) {
    const auth = await this.as.access(options)
    if (!auth.error) {
      return auth
    }
  }
}

/**
 * @template {}
 */
class ClaimedCapabilities {}

/**
 * @template {API.ParsedCapability} [T=API.ParsedCapability]
 */
class AccessDenied {
  /**
   *
   * @param {T} capabality
   * @param {object} cause
   * @param {API.UnavailableProof[]} [cause.unavailable]
   * @param {API.SourceCapability[]} [cause.unknown]
   * @param {API.SourceCapability[]} [cause.malformed]
   * @param {(AccessDenied|API.InvalidProof)[]} [cause.denied]
   */
  constructor(
    capabality,
    { unavailable = [], unknown = [], malformed = [], denied = [] }
  ) {
    this.capabality = capabality
    this.unavailable = unavailable
    this.unknown = unknown
    this.malformed = malformed
    this.denied = denied
    /** @type {true} */
    this.error = true
  }
}

class InvalidClaim {
  /**
   * @param {(API.UnavailableProof|AccessDenied)[]} errors
   * @param {API.SourceCapability[]} unknown
   * @param {API.SourceCapability[]} malformed
   */
  constructor(errors, unknown, malformed) {
    this.errors = errors
    this.unknown = unknown
    this.malformed = malformed
  }
}

/**
 * @template {API.ParsedCapability} [T=API.ParsedCapability]
 */
class Authorization {
  /**
   *
   * @param {T} capability
   * @param {API.Delegation} delegation
   * @param {Authorization|GroupAuthorization} [proof]
   */
  constructor(capability, delegation, proof) {
    this.capabilities = [capability]
    this.delegation = delegation
    this.proof = proof
  }
}

/**
 * @template {[Authorization, ...Authorization[]]} [Members=[Authorization, ...Authorization[]]]
 */
class GroupAuthorization {
  /**
   * @param {Members} members
   */
  constructor(members) {
    this.members = members
  }
}

/**
 * @template {API.ParsedCapability} T
 */
class Proof {
  /**
   * @param {T} capability
   * @param {API.Delegation} delegation
   * @param {API.Proof} [proof]
   */
}

/**
 * @template {API.Ability} [A=API.Ability]
 * @template [C={}]
 * @implements {API.ParsedCapability<A, API.InferCaveats<C>>}
 */
class CapabilityView {
  /**
   * @param {object} data
   * @param {A} data.can
   * @param {URL} data.uri
   * @param {API.InferCaveats<C>} data.caveats
   * @param {API.Delegation} data.delegation
   * @param {number} data.index
   */
  constructor({ can, uri, caveats, delegation, index }) {
    this.can = can
    this.uri = uri
    this.delegation = delegation
    this.index = index
    this.caveats = caveats
  }
  get with() {
    return this.delegation.capabilities[this.index].with
  }
}

/**
 * @param {API.Proof} proof
 * @param {API.ValidationOptions} options
 * @returns {Promise<API.Result<API.Delegation, API.UnavailableProof>>}
 */

const resolve = async (proof, { resolve = unavailable }) => {
  if (isLink(proof)) {
    return await resolve(proof)
  } else {
    return proof
  }
}

/**
 * @param {UCAN.Proof} proof
 */
const unavailable = proof => new UnavailableProof(proof)

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 */
class Capability {
  /**
   * @param {API.Descriptor<A, C>} descriptor
   */
  constructor(descriptor) {
    this.descriptor = descriptor
  }
  get can() {
    return this.descriptor.can
  }
  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.Claim<[API.Evidence<API.ParsedCapability<A, API.InferCaveats<C>>>]>}
   */
  claim(proofs) {
    const unknown = []
    const malformed = []
    const matched = []
    for (const proof of proofs) {
      for (const capability of proof.capabilities) {
        const result = parse(this, capability)
        if (!result.error) {
          matched.push(
            new MatchedCapabilities([new Evidence(result, capability, proof)])
          )
        } else {
          switch (result.name) {
            case "UnknownCapability":
              unknown.push(result.capability)
              break
            case "MalformedCapability":
            default:
              malformed.push(result.capability)
              break
          }
        }
      }
    }

    return { matched, unknown, malformed }
  }

  /**
   * @template {API.SingleCapability} O
   * @param {O} other
   * @returns {Capabilities<[this, O]>}
   */
  and(other) {
    return new Capabilities([this, other])
  }
}

/**
 * @template {Capability<API.Ability, {}>} As
 * @template {[Capability<API.Ability, {}>, ...Capability<API.Ability, {}>[]]} From
 */
class DerivedCapability {
  /**
   * @param {As} as
   * @param {From} from
   */
  constructor(as, from) {
    this.as = as
    this.from = from
  }
}

/**
 * @template {API.ParsedCapability} T
 * @template {API.SingleCapability<T>} As
 * @template {[API.SingleCapability, ...API.SingleCapability[]]} From
 */
class DerivedCapabilitySelector {
  /**
   * @param {T} capability
   * @param {As} as
   * @param {Capabilities<From>} from
   */
  constructor(capability, as, from) {
    this.capabality = capability
    this.as = as
    this.from = from
  }
  /**
   * @param {API.Delegation[]} proofs
   * @param {API.ValidationOptions} options
   */
  claim(proofs, options) {
    const direct = this.as.claim(proofs, options)
    return
    const derived = this.from.claim(proofs)
  }
}

/**
 * @template {[API.SingleCapability, ...API.SingleCapability[]]} T
 */
class Capabilities {
  /**
   * @param {T} capabilities
   */
  constructor(capabilities) {
    this.members = capabilities
  }
  /**
   * @template {API.SingleCapability} O
   * @param {O} other
   * @returns {Capabilities<[...T, O ]>}
   */
  and(other) {
    return new Capabilities(
      /** @type {[...T, O ] & [API.SingleCapability, ...API.SingleCapability[]]} */ ([
        ...this.members,
        other,
      ])
    )
  }

  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.Claim<API.InferEvidence<T>>}
   */
  claim(proofs) {
    let unknown
    let malformed
    const data = []
    for (const member of this.members) {
      const claim = member.claim(proofs)
      unknown = unknown ? intersection(unknown, claim.unknown) : claim.unknown
      malformed = malformed
        ? intersection(malformed, claim.malformed)
        : claim.malformed

      data.push(claim.matched.map(match => match.evidence[0]))
    }

    const evidence = /** @type {API.InferEvidence<T>[]} */ (combine(data))

    /** @type {API.MatchedCapabilities<API.InferEvidence<T>>[]} */
    const matched = evidence.map(group => new MatchedCapabilities(group))

    return { matched, unknown: unknown || [], malformed: malformed || [] }
  }
}

/**
 * @template {API.Tuple<API.Evidence>} T
 * @implements {API.MatchedCapabilities<T>}
 */
class MatchedCapabilities {
  /**
   * @param {T} evidence
   */
  constructor(evidence) {
    this.evidence = evidence
  }
  get capabilities() {
    return this.evidence.map(evidence => evidence.capability)
  }
  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.Claim<T>}
   */
  claim(proofs) {
    for (const evidence of this.evidence) {
      evidence
    }
  }
}

/**
 * @template {API.ParsedCapability} C
 * @implements {API.Evidence<C>}
 */
class Evidence {
  /**
   * @param {C} capability
   * @param {API.SourceCapability} source
   * @param {API.Delegation} proof
   */
  constructor(capability, source, proof) {
    this.source = source
    this.capability = capability
    this.delegation = proof
  }
}

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @template {API.ParsedCapability} T
 * @param {{descriptor: API.Descriptor<A, C>}} self
 * @param {API.Source} source
 * @returns {API.Result<API.ParsedCapability<A, API.InferCaveats<C>>, API.InvalidCapability>}
 */

const parse = (self, { capability, delegation, index }) => {
  const { can, with: parseWith, caveats: parsers } = self.descriptor
  if (capability.can !== can) {
    return new UnknownCapability(capability)
  }

  const uri = parseWith(capability.with)
  if (uri.error) {
    return new MalformedCapability(capability, uri)
  }

  const caveats = /** @type {T['caveats']} */ ({})

  if (parsers) {
    for (const [name, parse] of entries(parsers)) {
      const value = capability[/** @type {string} */ (name)]
      const result = parse(value)
      if (result?.error) {
        return new MalformedCapability(capability, result)
      } else if (result != null) {
        caveats[name] = result
      }
    }
  }

  return new CapabilityView({
    can,
    uri,
    delegation,
    caveats,
    index,
  })
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

/**
 * @template {API.Ability} [A=API.Ability]
 * @template {API.Caveats} [C={}]
 * @implements {API.MonoProver<API.ParsedCapability<A, API.InferCaveats<C>>>}
 */
class CapabilityProver {
  /**
   * @param {API.Descriptor<A, C>} descriptor
   */
  constructor(descriptor) {
    this.descriptor = descriptor
  }
  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.Selected<[API.State<API.ParsedCapability<A, API.InferCaveats<C>>, API.MonoProver<API.ParsedCapability<A, API.InferCaveats<C>>>>]>}
   */
  select(proofs) {
    const unknown = []
    const malformed = []
    const escalated = []
    /** @type {[API.State<API.ParsedCapability<A, API.InferCaveats<C>>, API.MonoProver<API.ParsedCapability<A, API.InferCaveats<C>>>>][]} */
    const matched = []
    for (const proof of proofs) {
      for (const [index, capability] of proof.capabilities.entries()) {
        const result = parse(this, { delegation: proof, capability, index })
        if (result.error) {
          if (parse.name === "UnknownCapability") {
            unknown.push(result.capability)
          } else {
            malformed.push(result.capability)
          }
        } else {
          matched.push([
            {
              value: result,
              next: this,
            },
          ])
        }
      }
    }

    return { matches: matched }
  }

  /**
   * @template {API.Prover<[API.State]>} Other
   * @param {Other} other
   */
  and(other) {
    return new GroupProver([this, other])
  }
}

/**
 * @template {[API.Prover<[API.State]>, ...API.Prover<[API.State]>[]]} Provers
 * @implements {API.PolyProver<Provers>}
 */

class GroupProver {
  /**
   * @param {Provers} provers
   */
  constructor(provers) {
    this.provers = provers
  }
  /**
   * @template {API.Prover<[API.State]>} Other
   * @param {Other} other
   * @returns {GroupProver<[...Provers, Other]>}
   */
  and(other) {
    return new GroupProver(
      /** @type {[...Provers, Other] & [API.Prover<[API.State]>, ...API.Prover<[API.State]>[]]} */ ([
        ...this.provers,
        other,
      ])
    )
  }
  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.Selected<API.InferStates<Provers>>}
   */

  select(proofs) {
    const groups = []
    for (const prover of this.provers) {
      const { matches } = prover.select(proofs)
      const members = []
      for (const [state] of matches) {
        members.push(state)
      }
      groups.push(members)
    }

    const combined = /** @type {API.InferStates<Provers>[]} */ (combine(groups))

    return { matches: combined }
  }
}

/**
 * @template {API.ParsedCapability} T
 * @template {[API.State, ...API.State[]]} S
 * @implements {API.DerivedProver<T, API.Prover<S>>}
 */

class DerivedProver {
  /**
   * @param {API.MonoProver<T>} as
   * @param {API.Prover<S>} from
   * @param {T} capability
   */
  constructor(as, from, capability) {
    this.as = as
    this.from = from
    this.capability = capability
  }

  /**
   * @param {API.Delegation[]} proofs
   * @returns {API.Selected<[API.State<T, API.Prover<S>|DerivedProver<T, API.Prover<S>>]>}
   */
  select(proofs) {
    /** @type {API.State<T, API.Prover<S> | API.DerivedProver<T, API.Prover<S>>>[]} */
    const matches = []
    for (const [state] of this.as.select(proofs).matches) {
      matches.push({
        ...state,
        next: this,
      })
    }

    for (const states of this.from.select(proofs).matches) {
    }
    throw 0
  }
}

import * as API from "@ucanto/interface"
import { entries, combine, intersection } from "./util.js"
import {
  EscalatedCapability,
  MalformedCapability,
  UnknownCapability,
  DelegationError as MatchError,
} from "./error.js"

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @param {API.Descriptor<A, C>} descriptor
 * @returns {API.TheCapabilityParser<A, C, API.CapabilityMatch<A, C>>}
 */
export const capability = descriptor => new Capability(descriptor)

/**
 * @template {API.Match} M
 * @template {API.Match} W
 * @param {API.Matcher<M>} left
 * @param {API.Matcher<W>} right
 * @returns {API.CapabilityParser<M|W>}
 */
export const or = (left, right) => new Or(left, right)

/**
 * @template {API.MatchSelector<API.Match>[]} Selectors
 * @param {Selectors} selectors
 * @returns {API.CapabilitiesParser<API.InferMembers<Selectors>>}
 */
export const and = (...selectors) => new And(selectors)

/**
 * @template {API.Match} M
 * @template {API.ParsedCapability} T
 * @param {API.DeriveSelector<M, T> & { from: API.MatchSelector<M> }} options
 * @returns {API.CapabilityParser<API.DerivedMatch<T, M>>}
 */
export const derive = ({ from, to, derives }) => new Derive(from, to, derives)

/**
 * @template {API.Match} M
 * @implements {API.View<M>}
 */
class View {
  /**
   * @param {API.Source} source
   * @returns {API.MatchResult<M>}
   */
  match(source) {
    return new UnknownCapability(source.capability)
  }

  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    return select(this, capabilities)
  }

  /**
   * @template {API.ParsedCapability} U
   * @param {API.DeriveSelector<M, U>} options
   * @returns {API.CapabilityParser<API.DerivedMatch<U, M>>}
   */
  derive({ derives, to }) {
    return derive({ derives, to, from: this })
  }
}

/**
 * @template {API.Match} M
 * @implements {API.CapabilityParser<M>}
 * @extends {View<M>}
 */
class Unit extends View {
  /**
   * @template {API.Match} W
   * @param {API.MatchSelector<W>} other
   * @returns {API.CapabilityParser<M | W>}
   */
  or(other) {
    return or(this, other)
  }

  /**
   * @template {API.Match} W
   * @param {API.CapabilityParser<W>} other
   * @returns {API.CapabilitiesParser<[M, W]>}
   */
  and(other) {
    return and(/** @type {API.CapabilityParser<M>} */ (this), other)
  }
}

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @implements {API.TheCapabilityParser<A, C, API.CapabilityMatch<A, C>>}
 * @extends {Unit<API.CapabilityMatch<A, C>>}
 */
class Capability extends Unit {
  /**
   * @param {API.Descriptor<A, C>} descriptor
   */
  constructor(descriptor) {
    super()
    this.descriptor = descriptor
  }

  get can() {
    return this.descriptor.can
  }

  /**
   * @param {API.Source} source
   * @returns {API.MatchResult<API.CapabilityMatch<A, C>>}
   */
  match(source) {
    const result = parse(this, source)
    return result.error ? result : new Match(source, result, this.descriptor)
  }
  toString() {
    return JSON.stringify({ can: this.descriptor.can })
  }
}

/**
 * @template {API.Match} M
 * @template {API.Match} W
 * @implements {API.CapabilityParser<M|W>}
 * @extends {Unit<M|W>}
 */
class Or extends Unit {
  /**
   * @param {API.Matcher<M>} left
   * @param {API.Matcher<W>} right
   */
  constructor(left, right) {
    super()
    this.left = left
    this.right = right
  }

  /**
   * @param {API.Source} capability
   * @return {API.MatchResult<M|W>}
   */
  match(capability) {
    const left = this.left.match(capability)
    if (left.error) {
      const right = this.right.match(capability)
      if (right.error) {
        return right.name === "MalformedCapability" ? right : left
      } else {
        return right
      }
    } else {
      return left
    }
  }

  toString() {
    return `${this.left.toString()}|${this.right.toString()}`
  }
}

/**
 * @template {API.MatchSelector<API.Match>[]} Selectors
 * @implements {API.CapabilitiesParser<API.InferMembers<Selectors>>}
 * @extends {View<API.Amplify<API.InferMembers<Selectors>>>}
 */
class And extends View {
  /**
   * @param {Selectors} selectors
   */
  constructor(selectors) {
    super()
    this.selectors = selectors
  }
  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<API.Amplify<API.InferMembers<Selectors>>>}
   */
  match(capability) {
    const group = []
    for (const selector of this.selectors) {
      const result = selector.match(capability)
      if (result.error) {
        return result
      } else {
        group.push(result)
      }
    }

    return new AndMatch(/** @type {API.InferMembers<Selectors>} */ (group))
  }

  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    return selectGroup(this, capabilities)
  }
  /**
   * @template E
   * @template {API.Match} X
   * @param {API.MatchSelector<API.Match<E, X>>} other
   * @returns {API.CapabilitiesParser<[...API.InferMembers<Selectors>, API.Match<E, X>]>}
   */
  and(other) {
    return new And([...this.selectors, other])
  }
  toString() {
    return `[${this.selectors.map(String).join(", ")}]`
  }
}

/**
 * @template {API.ParsedCapability} T
 * @template {API.Match} M
 * @implements {API.CapabilityParser<API.DerivedMatch<T, M>>}
 * @extends {Unit<API.DerivedMatch<T, M>>}
 */

class Derive extends Unit {
  /**
   * @param {API.MatchSelector<M>} from
   * @param {API.MatchSelector<API.DirectMatch<T>>} to
   * @param {API.Derives<T, M['value']>} derives
   */
  constructor(from, to, derives) {
    super()
    this.from = from
    this.to = to
    this.derives = derives
  }
  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<API.DerivedMatch<T, M>>}
   */
  match(capability) {
    const match = this.to.match(capability)
    if (match.error) {
      return match
    } else {
      return new DerivedMatch(match, this.from, this.derives)
    }
  }
  toString() {
    return this.to.toString()
  }
}

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @implements {API.CapabilityMatch<A, C>}
 */
class Match {
  /**
   * @param {API.Source} source
   * @param {API.ParsedCapability<A, API.InferCaveats<C>>} value
   * @param {API.Descriptor<A, C>} descriptor
   */
  constructor(source, value, descriptor) {
    this.source = [source]
    this.value = value
    this.descriptor = descriptor
  }
  get can() {
    return this.value.can
  }

  get proofs() {
    const proofs = [this.source[0].delegation]
    Object.defineProperties(this, {
      proofs: { value: proofs },
    })
    return proofs
  }

  /**
   * @param {API.CanIssue} context
   * @returns {API.CapabilityMatch<A, C>|null}
   */
  prune(context) {
    if (context.canIssue(this.value, this.source[0].delegation.issuer.did())) {
      return null
    } else {
      return this
    }
  }

  /**
   * @param {API.Source[]} capabilities
   * @returns {API.Select<API.CapabilityMatch<A, C>>}
   */
  select(capabilities) {
    const unknown = []
    const errors = []
    const matches = []
    for (const capability of capabilities) {
      const result = parse(this, capability)
      if (!result.error) {
        const claim = this.descriptor.derives(this.value, result)
        if (claim.error) {
          errors.push(
            new MatchError(
              [new EscalatedCapability(this.value, result, claim)],
              this
            )
          )
        } else {
          matches.push(new Match(capability, result, this.descriptor))
        }
      } else {
        switch (result.name) {
          case "UnknownCapability":
            unknown.push(result.capability)
            break
          case "MalformedCapability":
          default:
            errors.push(new MatchError([result], this))
        }
      }
    }

    return { matches, unknown, errors }
  }
  toString() {
    return JSON.stringify({
      can: this.descriptor.can,
      with: this.value.uri.href,
      caveats:
        Object.keys(this.value.caveats).length > 0
          ? this.value.caveats
          : undefined,
    })
  }
}

/**
 * @template {API.ParsedCapability} T
 * @template {API.Match} M
 * @implements {API.DerivedMatch<T, M>}
 */

class DerivedMatch {
  /**
   * @param {API.DirectMatch<T>} selected
   * @param {API.MatchSelector<M>} from
   * @param {API.Derives<T, M['value']>} derives
   */
  constructor(selected, from, derives) {
    this.selected = selected
    this.from = from
    this.derives = derives
  }
  get can() {
    return this.value.can
  }
  get source() {
    return this.selected.source
  }
  get proofs() {
    const proofs = []
    for (const { delegation } of this.selected.source) {
      proofs.push(delegation)
    }
    Object.defineProperties(this, { proofs: { value: proofs } })
    return proofs
  }
  get value() {
    return this.selected.value
  }

  /**
   * @param {API.CanIssue} context
   */
  prune(context) {
    const selected =
      /** @type {API.DirectMatch<T>|null} */
      (this.selected.prune(context))
    return selected ? new DerivedMatch(selected, this.from, this.derives) : null
  }

  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    const { derives, selected, from } = this
    const { value } = selected

    const direct = selected.select(capabilities)

    const derived = from.select(capabilities)
    const matches = []
    const errors = []
    for (const match of derived.matches) {
      // If capability can not be derived it escalates
      const result = derives(value, match.value)
      if (result.error) {
        errors.push(
          new MatchError(
            [new EscalatedCapability(value, match.value, result)],
            this
          )
        )
      } else {
        matches.push(match)
      }
    }

    return {
      unknown: intersection(direct.unknown, derived.unknown),
      errors: [
        ...errors,
        ...direct.errors,
        ...derived.errors.map(error => new MatchError([error], this)),
      ],
      matches: [
        ...direct.matches.map(match => new DerivedMatch(match, from, derives)),
        ...matches,
      ],
    }
  }

  toString() {
    return this.selected.toString()
  }
}

/**
 * @template {API.MatchSelector<API.Match>[]} Selectors
 * @implements {API.Amplify<API.InferMembers<Selectors>>}
 */
class AndMatch {
  /**
   * @param {API.Match[]} matches
   */
  constructor(matches) {
    this.matches = matches
  }
  get selectors() {
    return this.matches
  }
  /**
   * @returns {API.Source[]}
   */
  get source() {
    const source = []

    for (const match of this.matches) {
      source.push(...match.source)
    }
    Object.defineProperties(this, { source: { value: source } })
    return source
  }

  /**
   * @param {API.CanIssue} context
   */
  prune(context) {
    const matches = []
    for (const match of this.matches) {
      const pruned = match.prune(context)
      if (pruned) {
        matches.push(pruned)
      }
    }
    return matches.length === 0 ? null : new AndMatch(matches)
  }

  get proofs() {
    const proofs = []

    for (const { delegation } of this.source) {
      proofs.push(delegation)
    }

    Object.defineProperties(this, { source: { value: proofs } })
    return proofs
  }
  /**
   * @type {API.InferValue<API.InferMembers<Selectors>>}
   */
  get value() {
    const value = []

    for (const match of this.matches) {
      value.push(match.value)
    }
    Object.defineProperties(this, { value: { value } })
    return /** @type {any} */ (value)
  }
  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    return selectGroup(this, capabilities)
  }
  toString() {
    return `[${this.matches.map(match => match.toString()).join(", ")}]`
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

const parse = (self, source) => {
  const { can, with: withDecoder, caveats: decoders } = self.descriptor
  const { delegation, index } = source
  const capability = /** @type {API.Capability & Record<string, unknown>} */ (
    source.capability
  )

  if (capability.can !== can) {
    return new UnknownCapability(capability)
  }

  const uri = withDecoder.decode(capability.with)
  if (uri.error) {
    return new MalformedCapability(capability, uri)
  }

  const caveats = /** @type {T['caveats']} */ ({})

  if (decoders) {
    for (const [name, decoder] of entries(decoders)) {
      const value = capability[/** @type {string} */ (name)]
      const result = decoder.decode(value)
      if (result?.error) {
        return new MalformedCapability(capability, result)
      } else if (result != null) {
        caveats[name] = result
      }
    }
  }

  return new CapabilityView(can, capability.with, uri, caveats, delegation)
}

/**
 * @template {API.Ability} A
 * @template C
 * @implements {API.ParsedCapability<A, API.InferCaveats<C>>}
 */
class CapabilityView {
  /**
   * @param {A} can
   * @param {API.Resource} with_
   * @param {URL} uri
   * @param {API.InferCaveats<C>} caveats
   * @param {API.Delegation} delegation
   */
  constructor(can, with_, uri, caveats, delegation) {
    this.can = can
    this.with = with_
    this.uri = uri
    this.delegation = delegation
    this.caveats = caveats
  }
}

/**
 * @template {API.Match} M
 * @param {API.Matcher<M>} matcher
 * @param {API.Source[]} capabilities
 */

const select = (matcher, capabilities) => {
  const unknown = []
  const matches = []
  const errors = []
  for (const capability of capabilities) {
    const result = matcher.match(capability)
    if (result.error) {
      switch (result.name) {
        case "UnknownCapability":
          unknown.push(result.capability)
          break
        case "MalformedCapability":
        default:
          errors.push(new MatchError([result], result.capability))
      }
    } else {
      matches.push(result)
    }
  }

  return { matches, errors, unknown }
}

/**
 * @template {API.Selector<API.Match>[]} S
 * @param {{selectors:S}} self
 * @param {API.Source[]} capabilities
 */

const selectGroup = (self, capabilities) => {
  let unknown
  const data = []
  const errors = []
  for (const selector of self.selectors) {
    const selected = selector.select(capabilities)
    unknown = unknown
      ? intersection(unknown, selected.unknown)
      : selected.unknown

    for (const error of selected.errors) {
      errors.push(new MatchError([error], self))
    }

    data.push(selected.matches)
  }

  const matches = combine(data).map(group => new AndMatch(group))

  return {
    unknown: unknown || [],
    errors,
    matches,
  }
}

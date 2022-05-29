import * as API from "./api.js"
import { entries, combine, intersection } from "./util.js"
import {
  Failure,
  EscalatedCapability,
  MalformedCapability,
  UnknownCapability,
  DelegationError as MatchError,
} from "../error.js"

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @param {API.Config<A, C, API.DirectMatch<API.ParsedCapability<A, C>>>} descriptor
 * @returns {API.Capability<API.DirectMatch<API.ParsedCapability<A, C>>>}
 */
export const capability = descriptor => new Capability(descriptor)

/**
 * @template {API.Match} M
 * @template {API.Match} W
 * @param {API.MatchSelector<M>} left
 * @param {API.MatchSelector<W>} right
 * @returns {API.MatchSelector<M|W>}
 */
export const or = (left, right) => new Or(left, right)

/**
 * @template {API.MatchSelector<API.Match>[]} Selectors
 * @param {Selectors} selectors
 * @returns {API.CapabilityGroup<API.InferMembers<Selectors>>}
 */
export const and = (...selectors) => new And(selectors)

/**
 * @template {API.Match} M
 * @template {API.ParsedCapability} T
 * @param {API.DeriveSelector<M, T> & { from: API.MatchSelector<M> }} options
 * @returns {API.MatchSelector<API.DerivedMatch<T, M>>}
 */
export const derive = ({ from, to, derives }) => new Derive(from, to, derives)

/**
 * @template {API.Match} M
 * @implements {API.View<M>}
 */
class View {
  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<M>}
   */
  match(capability) {
    return new MatchError([new UnknownCapability(capability)], this)
  }

  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    return select(this, capabilities)
  }

  /**
   * @template {API.Match} W
   * @param {API.MatchSelector<W>} other
   * @returns {API.MatchSelector<M | W>}
   */
  or(other) {
    return or(this, other)
  }

  /**
   * @template {API.ParsedCapability} U
   * @param {API.DeriveSelector<M, U>} options
   * @returns {API.MatchSelector<API.DerivedMatch<U, M>>}
   */
  derive({ derives, to }) {
    return derive({ derives, to, from: this })
  }
}

/**
 * @template {API.Match} M
 * @implements {API.Capability<M>}
 * @extends {View<M>}
 */
class Unit extends View {
  /**
   * @template {API.Match} W
   * @param {API.Capability<W>} other
   * @returns {API.CapabilityGroup<[M, W]>}
   */
  and(other) {
    return and(/** @type {API.Capability<M>} */ (this), other)
  }
}

/**
 * @template {API.ParsedCapability} T
 * @implements {API.Capability<API.DirectMatch<T>>}
 * @extends {Unit<API.DirectMatch<T>>}
 */
class Capability extends Unit {
  /**
   * @param {API.Descriptor<T, API.DirectMatch<T>>} descriptor
   */
  constructor(descriptor) {
    super()
    this.descriptor = descriptor
  }

  get can() {
    return this.descriptor.can
  }

  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<API.DirectMatch<T>>}
   */
  match(capability) {
    const result = parse(this, capability)
    return result.error
      ? new MatchError([result.error], this)
      : new Match(result, this.descriptor)
  }
  toString() {
    return JSON.stringify({ can: this.descriptor.can })
  }
}

/**
 * @template {API.Match} M
 * @template {API.Match} W
 * @implements {API.Capability<M|W>}
 * @extends {Unit<M|W>}
 */
class Or extends Unit {
  /**
   * @param {API.MatchSelector<M>} left
   * @param {API.MatchSelector<W>} right
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
        return new MatchError([left, right], this)
      } else {
        return right
      }
    } else {
      return left
    }
  }

  /**
   * @param {API.Source[]} capabilites
   */
  *select(capabilites) {
    const unknown = new Map()
    const left = []
    for (const capability of this.left.select(capabilites)) {
      if (capability.error) {
        const { cause } = capability.error
        if (cause.name === "UnknownCapability") {
          unknown.set(cause.capability, capability)
        } else {
          left.push(capability)
        }
      } else {
        yield capability
      }
    }

    const right = []
    for (const capability of this.right.select(capabilites)) {
      if (capability.error) {
        const { cause } = capability.error
        if (cause.name === "UnknownCapability") {
          const other = unknown.get(cause.capability)
          if (other) {
            left.push(other)
            right.push(other)
          }
        } else {
          right.push(capability)
        }
      } else {
        yield capability
      }
    }

    const causes = []
    if (left.length > 0) {
      causes.push(new MatchError(left, this.left))
    }
    if (right.length > 0) {
      causes.push(new MatchError(right, this.right))
    }

    if (causes.length > 0) {
      yield new MatchError(causes, this)
    }
  }
  toString() {
    return `${this.left.toString()}|${this.right.toString()}`
  }
}

/**
 * @template {API.MatchSelector<API.Match>[]} Selectors
 * @implements {API.CapabilityGroup<API.InferMembers<Selectors>>}
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
        return new MatchError([result.error], this)
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
   * @returns {API.CapabilityGroup<[...API.InferMembers<Selectors>, API.Match<E, X>]>}
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
 * @implements {API.Capability<API.DerivedMatch<T, M>>}
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
 * @template {API.ParsedCapability} T
 * @implements {API.DirectMatch<T>}
 */
class Match {
  /**
   * @param {T} value
   * @param {API.Descriptor<T, API.DirectMatch<T>>} descriptor
   */
  constructor(value, descriptor) {
    this.value = value
    this.descriptor = descriptor
  }
  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<API.DirectMatch<T>>}
   */
  match(capability) {
    const result = parse(this, capability)
    if (result.error) {
      return new MatchError([result], this)
    }

    const claim = this.descriptor.derives(this.value, result)
    if (claim?.error) {
      // TODO: Consider passing source capbility instead or along with parsed
      // capability.
      return new MatchError(
        [new EscalatedCapability(this.value, result, claim)],
        this
      )
    }

    return new Match(result, this.descriptor)
  }

  /**
   * @param {API.Source} capability
   */
  match2(capability) {
    const result = parse(this, capability)
    if (result.error) {
      return result.name === "MalformedCapability" ? result : null
    } else {
      const claim = this.descriptor.derives(this.value, result)
      if (claim.error) {
        return new EscalatedCapability(this.value, result, claim)
      } else {
        return new Match(result, this.descriptor)
      }
    }
  }
  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    return select(this, capabilities)
  }
  /**
   * @param {API.Source[]} capabilities
   * @returns {API.Select<API.DirectMatch<T>>}
   */
  select2(capabilities) {
    return select2(this, capabilities)
  }
  toString() {
    return JSON.stringify({
      can: this.descriptor.can,
      with: this.value.with.href,
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
  get value() {
    return this.selected.value
  }
  /**
   * @param {API.Source[]} capabilities
   */
  *select(capabilities) {
    const { derives, selected, from } = this
    const { value } = selected
    const errors = []
    const unknowns = new Map()

    for (const match of selected.select(capabilities)) {
      if (!match.error) {
        // When capability `account/register` is derived from `account/verify`
        // we consider proofs delegating `account/register` along with
        // `account/verify`. We do need to wrap `account/register` matches
        // like below so that subdelegated `account/verify` could continues
        // to be a valid proof several levels deep.
        yield new DerivedMatch(match, from, derives)
      } else {
        const { cause } = match
        if (cause.name === "UnknownCapability") {
          unknowns.set(cause.capability, match)
        } else {
          errors.push(match)
        }
      }
    }

    // Next we consider proofs delegating capabilities this was derived from e.g
    // if this represents `account/register` derived from `account/verify` here
    // we are considering `account/verify`. This time around we no longer wrap
    // matches because `account/verify` is proved by whatever it is derived from.
    for (const match of from.select(capabilities)) {
      // If capability isn't unknown or it was unknown according to other
      // selector
      if (match.error) {
        const { cause } = match
        // If error is due to capability been unknown we only want to keep it
        // if it's truly unknown, that is other selector also reported it
        // as unknown. If both marked it unknown we keep both errors as they'll
        // have different contexts.
        if (cause.name === "UnknownCapability") {
          const error = unknowns.get(cause.capability)
          if (error) {
            errors.push(error, match)
          }
        } else {
          errors.push(match)
        }
      } else {
        // If capability can not be derived it escalates
        const result = derives(value, match.value)
        if (result.error) {
          errors.push(new EscalatedCapability(value, match.value, result))
        } else {
          yield match
        }
      }
    }

    // If we encountered some errors report them.
    if (errors.length > 0) {
      yield new MatchError(errors, this)
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
 * @template {API.ParsedCapability} T
 * @template {API.Match} M
 * @param {{descriptor: API.Descriptor<T, M>}} self
 * @param {API.Source} capability
 * @returns {API.Result<T, API.InvalidCapability>}
 */

const parse = (self, capability) => {
  const { can, with: parseWith, caveats: parsers } = self.descriptor
  if (capability.can !== can) {
    return new UnknownCapability(capability)
  }

  const uri = parseWith(capability.with)
  if (uri.error) {
    return new MalformedCapability(capability, uri.error)
  }

  const caveats = /** @type {T['caveats']} */ ({})

  if (parsers) {
    for (const [name, parse] of entries(parsers)) {
      const result = parse(capability[/** @type {string} */ (name)])
      if (result?.error) {
        return new MalformedCapability(capability, result.error)
      } else {
        caveats[name] = result
      }
    }
  }

  return /** @type {T} */ ({ can, with: uri, caveats })
}

/**
 * @template {API.Match} M
 * @param {API.Matcher<M>} matcher
 * @param {API.Source[]} capabilities
 */

const select = function* (matcher, capabilities) {
  for (const capability of capabilities) {
    yield matcher.match(capability)
  }
}

/**
 * @template {API.Match} M
 * @param {{match2(capability:API.Source):API.Result<M|null, API.MalformedCapability|API.EscalatedCapability>}} matcher
 * @param {API.Source[]} capabilities
 * @returns {API.Select<M>}
 */

const select2 = (matcher, capabilities) => {
  const unknown = []
  const malformed = []
  const matched = []
  const escalated = []
  for (const capability of capabilities) {
    const result = matcher.match2(capability)
    if (result == null) {
      unknown.push(capability)
    } else if (result.error) {
      switch (result.name) {
        case "EscalatedCapability":
          escalated.push(result)
          break
        case "MalformedCapability":
          malformed.push(result)
          break
      }
    } else if (result) {
      matched.push(result)
    }
  }

  return { escalated, matched, malformed, unknown }
}

/**
 * @template {API.Selector<API.Match>[]} S
 * @param {{selectors:S}} self
 * @param {API.Source[]} capabilities
 */

const selectGroup = function* (self, capabilities) {
  const errors = []
  const data = []
  const unknown = new Map()

  for (const selector of self.selectors) {
    const matches = []
    const causes = []
    for (const capability of selector.select(capabilities)) {
      if (capability.error) {
        const cause = capability.cause
        if (cause.name === "UnknownCapability") {
          const errors = unknown.get(cause.capability) || []
          unknown.set(cause.capability, [...errors, capability.error])
        } else {
          causes.push(capability.error)
        }
      } else {
        matches.push(capability)
      }
    }

    if (causes.length > 0) {
      errors.push(new MatchError(causes, selector))
    }

    // If we have 0 matches on one of the selectors we will not be able to
    // match so there is no point exploring other selectors.
    if (matches.length === 0) {
      data.length = 0
      break
    } else {
      data.push(matches)
    }
  }

  if (data.length > 0) {
    for (const group of combine(data)) {
      yield new AndMatch(group)
    }
  }

  // also yield the error if we encountered them
  if (errors.length > 0) {
    yield new MatchError(errors, self)
  }

  // yield errors for all the unknown capabilities that were not know
  // by any of the selectors.
  for (const errors of unknown.values()) {
    if (errors.length === self.selectors.length) {
      yield new MatchError(errors, self)
    }
  }
}

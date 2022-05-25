import * as API from "./api.js"
import { entries, combine } from "./util.js"
import { MalformedCapability, UnknownCapability } from "../error.js"

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
 * @template T
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
    return new UnknownCapability(capability)
  }

  /**
   * @param {API.Source[]} capabilities
   * @returns {M[]}
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
   * @template U
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

  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<API.DirectMatch<T>>}
   */
  match(capability) {
    const result = parse(this, capability)
    return result.error ? result.error : new Match(result, this.descriptor)
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
    const result = this.left.match(capability)
    if (result.error) {
      return this.right.match(capability)
    } else {
      return result
    }
  }
  /**
   * @param {API.Source[]} capabilites
   */
  select(capabilites) {
    return [...this.left.select(capabilites), ...this.right.select(capabilites)]
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
    const tuple = []
    for (const selector of this.selectors) {
      const result = selector.match(capability)
      if (result.error) {
        return result.error
      } else {
        tuple.push(result)
      }
    }

    return new AndMatch(
      this.selectors,
      /** @type {API.InferMembers<Selectors>} */ (tuple)
    )
  }
  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    const data = this.selectors.map(selector => selector.select(capabilities))
    const result = combine(data).map(
      selected => new AndMatch(this.selectors, selected)
    )

    return /** @type {any[]} */ (result)
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
}

/**
 * @template T
 * @template {API.Match} M
 * @implements {API.Capability<API.DerivedMatch<T, M>>}
 * @extends {Unit<API.DerivedMatch<T, M>>}
 */

class Derive extends Unit {
  /**
   * @param {API.MatchSelector<M>} from
   * @param {API.MatchSelector<API.DirectMatch<T>>} to
   * @param {(self:T, from:M['value']) => boolean} derives
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
      return match.error
    } else {
      return new DerivedMatch(match, this.from, this.to, this.derives)
    }
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
      return result.error
    }

    const claim = this.descriptor.derives(this.value, result)
    if (claim.error) {
      return claim.error
    }

    return new Match(result, this.descriptor)
  }
  /**
   * @param {API.Source[]} capabilities
   */
  select(capabilities) {
    return select(this, capabilities)
  }
}

/**
 * @template T
 * @template {API.Match} M
 * @implements {API.DerivedMatch<T, M>}
 */

class DerivedMatch {
  /**
   * @param {API.DirectMatch<T>} selected
   * @param {API.MatchSelector<M>} from
   * @param {API.MatchSelector<API.DirectMatch<T>>} to
   * @param {API.Derives<T, M['value']>} derives
   */
  constructor(selected, from, to, derives) {
    this.selected = selected
    this.from = from
    this.to = to
    this.derives = derives
  }
  get value() {
    return this.selected.value
  }
  /**
   *
   * @param {API.Source[]} capabilities
   * @returns {(API.DerivedMatch<T, M>|M)[]}
   */
  select(capabilities) {
    const { derives, selected, from, to } = this
    const { value } = selected
    const derived = selected
      .select(capabilities)
      .map(match => new DerivedMatch(match, from, to, derives))

    const delegated = from
      .select(capabilities)
      .filter(delegated => derives(value, delegated.value))

    return [...derived, ...delegated]
  }
}

/**
 * @template {API.MatchSelector<API.Match>[]} Selectors
 * @implements {API.Amplify<API.InferMembers<Selectors>>}
 */
class AndMatch {
  /**
   * @param {Selectors} selectors
   * @param {API.Match[]} selected
   */
  constructor(selectors, selected) {
    this.selected = selected
    this.selectors = selectors
  }
  /**
   * @type {API.InferValue<API.InferMembers<Selectors>>}
   */
  get value() {
    const value = []

    for (const match of this.selected) {
      value.push(match.value)
    }
    Object.defineProperties(this, { value: { value } })
    return /** @type {any} */ (value)
  }

  /**
   * @param {API.Source[]} capabilities
   * @returns {API.Amplify<API.InferMatch<API.InferMembers<Selectors>>>[]} 

   */
  select(capabilities) {
    const data = this.selectors.map(selector => selector.select(capabilities))
    const result = combine(data).map(
      selected => new AndMatch(this.selectors, selected)
    )

    return /** @type {any[]} */ (result)
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
    return new MalformedCapability(capability, [uri.error])
  }

  const caveats = /** @type {T['caveats']} */ ({})

  if (parsers) {
    for (const [name, parse] of entries(parsers)) {
      const result = parse(capability[/** @type {string} */ (name)])
      if (!result.error) {
        caveats[name] = result
      } else {
        return new MalformedCapability(capability, [result.error])
      }
    }
  }

  return /** @type {T} */ ({ can, with: uri, caveats })
}

/**
 * @template {API.ParsedCapability} T
 * @template {API.Match} M
 * @typedef {{
 * value?: T
 * descriptor: API.Descriptor<T, M>
 * next: API.MatchSelector<M>
 * }} Self
 */

/**
 * @template {API.Match} M
 * @param {API.Matcher<M>} matcher
 * @param {API.Source[]} capabilities
 * @returns {M[]}
 */

const select = (matcher, capabilities) => {
  const matches = []
  for (const capability of capabilities) {
    const result = matcher.match(capability)
    if (!result.error) {
      matches.push(result)
    }
  }
  return matches
}

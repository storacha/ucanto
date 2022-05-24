import * as API from "./api.js"
import { entries, combine } from "./util.js"
import { MalformedCapability, UnknownCapability } from "../error.js"

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @param {API.CapabilityConfig<A, C, API.DirectMatch<API.CapabilityView<A, C>>>} descriptor
 * @returns {API.UnitSelector<API.DirectMatch<API.CapabilityView<A, C>>>}
 */
export const capability = descriptor => new Capability(descriptor)

/**
 * @template {API.Match} M
 * @template {API.Match} W
 * @param {API.Selector<M>} left
 * @param {API.Selector<W>} right
 * @returns {API.Selector<M|W>}
 */
export const or = (left, right) => new Or(left, right)

/**
 * @template {API.Selector<API.Match>[]} Selectors
 * @param {Selectors} selectors
 * @returns {API.GroupSelector<API.InferMembers<Selectors>>}
 */
export const and = (...selectors) => new And(selectors)

/**
 * @template {API.Match} M
 * @template T
 * @param {API.DeriveSelector<M, T> & { from: API.Selector<M> }} options
 * @returns {API.Selector<API.DerivedMatch<T, M>>}
 */
export const derive = ({ from, to, derives }) => new Derive(from, to, derives)

/**
 * @template {API.Match} M
 * @implements {API.Selector<M>}
 */
class Selector {
  /**
   * @param {API.Capability} _capability
   * @returns {M|null}
   */
  match(_capability) {
    return null
  }

  /**
   * @param {API.Capability[]} capabilities
   * @returns {M[]}
   */
  select(capabilities) {
    return select(this, capabilities)
  }

  /**
   * @template {API.Match} W
   * @param {API.Selector<W>} other
   * @returns {API.Selector<M | W>}
   */
  or(other) {
    return or(this, other)
  }

  /**
   * @template U
   * @param {API.DeriveSelector<M, U>} options
   * @returns {API.Selector<API.DerivedMatch<U, M>>}
   */
  derive({ derives, to }) {
    return derive({ derives, to, from: this })
  }
}

/**
 * @template {API.Match} M
 * @implements {API.UnitSelector<M>}
 * @extends {Selector<M>}
 */
class UnitSelector extends Selector {
  /**
   * @template U
   * @template {API.Match} W
   * @param {API.Selector<API.Match<U, W>>} other
   * @returns {API.GroupSelector<[M, API.Match<U, W>]>}
   */
  and(other) {
    return and(/** @type {API.UnitSelector<M>} */ (this), other)
  }
}

/**
 * @template {API.CapabilityView} T
 * @implements {API.UnitSelector<API.DirectMatch<T>>}
 * @extends {UnitSelector<API.DirectMatch<T>>}
 */
class Capability extends UnitSelector {
  /**
   * @param {API.Descriptor<T, API.DirectMatch<T>>} descriptor
   */
  constructor(descriptor) {
    super()
    this.descriptor = descriptor
  }

  /**
   * @param {API.Capability} capability
   * @returns {API.DirectMatch<T>|null}
   */
  match(capability) {
    const result = parse(this, capability)
    return result.error ? null : new Match(result, this.descriptor)
  }
}

/**
 * @template {API.Match} M
 * @template {API.Match} W
 * @implements {API.Selector<M|W>}
 * @extends {UnitSelector<M|W>}
 */
class Or extends UnitSelector {
  /**
   * @param {API.Selector<M>} left
   * @param {API.Selector<W>} right
   */
  constructor(left, right) {
    super()
    this.left = left
    this.right = right
  }
  /**
   * @param {API.Capability} capability
   */
  match(capability) {
    return this.left.match(capability) || this.right.match(capability)
  }
  /**
   * @param {API.Capability[]} capabilites
   */
  select(capabilites) {
    return [...this.left.select(capabilites), ...this.right.select(capabilites)]
  }
}

/**
 * @template {API.Selector<API.Match>[]} Selectors
 * @implements {API.GroupSelector<API.InferMembers<Selectors>>}
 * @extends {Selector<API.Amplify<API.InferMembers<Selectors>>>}
 */
class And extends Selector {
  /**
   * @param {Selectors} selectors
   */
  constructor(selectors) {
    super()
    this.selectors = selectors
  }
  /**
   * @param {API.Capability} capability
   */
  match(capability) {
    const tuple = []
    for (const selector of this.selectors) {
      const result = selector.match(capability)
      if (result) {
        tuple.push(result)
      } else {
        return null
      }
    }

    return new AndMatch(
      this.selectors,
      /** @type {API.InferMembers<Selectors>} */ (tuple)
    )
  }
  /**
   * @param {API.Capability[]} capabilities
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
   * @param {API.Selector<API.Match<E, X>>} other
   * @returns {API.GroupSelector<[...API.InferMembers<Selectors>, API.Match<E, X>]>}
   */
  and(other) {
    return new And([...this.selectors, other])
  }
}

/**
 * @template T
 * @template {API.Match} M
 * @implements {API.Selector<API.DerivedMatch<T, M>>}
 * @extends {UnitSelector<API.DerivedMatch<T, M>>}
 */

class Derive extends UnitSelector {
  /**
   * @param {API.Selector<M>} from
   * @param {API.Selector<API.DirectMatch<T>>} to
   * @param {(self:T, from:M['value']) => boolean} derives
   */
  constructor(from, to, derives) {
    super()
    this.from = from
    this.to = to
    this.derives = derives
  }
  /**
   * @param {API.Capability} capability
   * @returns {API.DerivedMatch<T, M>|null}
   */
  match(capability) {
    const match = this.to.match(capability)
    if (match) {
      return new DerivedMatch(match, this.from, this.to, this.derives)
    }
    return null
  }
}

/**
 * @template {API.CapabilityView} T
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
   * @param {API.Capability} capability
   * @returns {API.DirectMatch<T>|null}
   */
  match(capability) {
    const result = parse(this, capability)
    if (result.error) {
      return null
    }

    if (!this.descriptor.derives(this.value, result)) {
      return null
    }

    return new Match(result, this.descriptor)
  }
  /**
   * @param {API.Capability[]} capabilities
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
   * @param {API.Selector<M>} from
   * @param {API.Selector<API.DirectMatch<T>>} to
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
   * @param {API.Capability[]} capabilities
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
 * @template {API.Selector<API.Match>[]} Selectors
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
   * @param {API.Capability[]} capabilities
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
 * @template {API.CapabilityView} T
 * @template {API.Match} M
 * @param {{descriptor: API.Descriptor<T, M>}} self
 * @param {API.Capability} capability
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
 * @template {API.CapabilityView} T
 * @template {API.Match} M
 * @typedef {{
 * value?: T
 * descriptor: API.Descriptor<T, M>
 * next: API.Selector<M>
 * }} Self
 */

/**
 * @template {API.Match} M
 * @param {API.Select<M>} matcher
 * @param {API.Capability[]} capabilities
 * @returns {M[]}
 */

const select = (matcher, capabilities) => {
  const matches = []
  for (const capability of capabilities) {
    const result = matcher.match(capability)
    if (result) {
      matches.push(result)
    }
  }
  return matches
}

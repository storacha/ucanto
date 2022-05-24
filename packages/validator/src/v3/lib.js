import * as API from "./api.js"
import { MalformedCapability, UnknownCapability } from "../error.js"

/**
 * @template {API.Ability} Ability
 * @template {API.Caveats} Caveats
 * @param {API.CapabilityDescriptor<Ability, Caveats>} descriptor
 * @returns {API.CapabilityMatcher<Ability, Caveats>}
 */
export const capability = descriptor => new Capability(descriptor)

/**
 * @template {API.Matcher[]} M
 * @param {M} capabilities
 * @returns {API.AmilficationMatcher<API.InferAmplificationInput<M>>}
 */
export const amplify = (...capabilities) => new Amilfication(capabilities)

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @template {API.Match} M
 * @implements {API.Matcher<API.CapabilityMatch<A, C, M>>}
 */
class DerivedCapability {
  /**
   * @param {API.DeriveOptions<A, C, M>} options
   * @param {API.Matcher<M>} matcher
   */
  constructor({ can, check, with: parseWith, caveats }, matcher) {
    this.can = can
    this.check = check
    this.parseWith = parseWith
    this.parsers = caveats
    this.matcher = matcher
  }
  /**
   * @param {API.UCAN.Capability} capability
   * @returns {API.Result<API.CapabilityView<A, C>, API.InvalidCapability>}
   */
  parse(capability) {
    const { can, parsers, parseWith } = this
    if (capability.can !== can) {
      return new UnknownCapability(capability)
    }

    const uri = parseWith(capability.with)
    if (uri.error) {
      return new MalformedCapability(capability, [uri.error])
    }

    const caveats = /** @type {API.InferCaveats<C>} */ ({})

    if (parsers) {
      for (const [name, parse] of entries(parsers)) {
        const result = parse(capability[/** @type {string} */ (name)])
        if (!result.error) {
          caveats[name] = /** @type {any} */ (result)
        } else {
          return new MalformedCapability(capability, [result.error])
        }
      }
    }

    return { can, with: uri, caveats }
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.Match<API.CapabilityView<A, C>, M>[]}
   */
  match(capabilities) {
    const matches = []
    for (const capability of capabilities) {
      const result = this.parse(capability)
      if (!result.error) {
        matches.push(new Match(result, this.matcher, this))
      }
    }

    return matches
  }

  /**
   * @template {{ can: API.Ability }} E
   * @param {API.DeriveDescriptor<E, API.Match<T, M>>} descriptor
   * @returns {API.Matcher<API.Match<E, API.Match<T, M>>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Ability} B
   * @template {API.Caveats} D
   * @param {API.DeriveOptions<B, D, API.CapabilityMatch<A, C, M>>} descriptor
   * @returns {API.Matcher<API.CapabilityMatch<B, D, API.CapabilityMatch<A, C, M>>>}
   */
  and(descriptor) {
    return and(this, descriptor)
  }

  /**
   * @template {API.Match<{ can: API.Ability }, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<API.Match<T, M>|W>}
   */
  or(other) {
    return or(this, other)
  }
}

/**
 * @template {API.Ability} Ability
 * @template {API.Caveats} Caveats
 * @implements {API.CapabilityMatcher<Ability, Caveats>}
 */
class Capability {
  /**
   * @param {API.CapabilityDescriptor<Ability, Caveats>} descriptor
   */
  constructor({ can, check, with: parseWith, caveats }) {
    this.can = can
    this.check = check
    this.parseWith = parseWith
    this.parsers = caveats
  }
  /**
   * @param {API.UCAN.Capability} capability
   * @returns {API.Result<API.CapabilityView<Ability, Caveats>, API.InvalidCapability>}
   */
  parse(capability) {
    const { can, parsers, parseWith } = this
    if (capability.can !== can) {
      return new UnknownCapability(capability)
    }

    const uri = parseWith(capability.with)
    if (uri.error) {
      return new MalformedCapability(capability, [uri.error])
    }

    const caveats = /** @type {API.InferCaveats<Caveats>} */ ({})

    if (parsers) {
      for (const [name, parse] of entries(parsers)) {
        const result = parse(capability[/** @type {string} */ (name)])
        if (!result.error) {
          caveats[name] = /** @type {any} */ (result)
        } else {
          return new MalformedCapability(capability, [result.error])
        }
      }
    }

    return { can, with: uri, caveats }
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.DirectMatch<API.CapabilityView<Ability, Caveats>>[]}
   */
  match(capabilities) {
    const matches = []
    for (const capability of capabilities) {
      const result = this.parse(capability)
      if (!result.error) {
        matches.push(new Match(result, this, this))
      }
    }

    return matches
  }

  /**
   * @template {API.Ability} B
   * @template {API.Caveats} D
   * @param {API.DeriveOptions<B, D, API.CapabilityMatch<A, C, M>>} descriptor
   * @returns {API.Matcher<API.CapabilityMatch<B, D, API.CapabilityMatch<A, C, M>>>}
   */

  /**
   * @template {{ can: API.Ability }} E
   * @param {API.DeriveDescriptor<E, API.Match<T, M>>} descriptor
   * @returns {API.Matcher<API.Match<E, API.Match<T, M>>>}
   */
  and(descriptor) {
    return and(this, descriptor)
  }

  /**
   * @template {API.Match<{ can: API.Ability }, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<API.Match<this, Match|W>>}
   */
  or(other) {
    return or(this, other)
  }
}

/**
 * @template {API.Matcher[]} M
 * @returns {API.AmilficationMatcher<M>}
 */
export class Amilfication {
  /**
   * @param {M} members
   */
  constructor(members) {
    this.members = members
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.MatchAmilfication<M>[]}
   */
  match(capabilities) {
    const matrix = this.members.map(member => member.match(capabilities))
    const matches = comb(matrix)
    return matches.map(match => new MatchAmilpification(match))
  }
  /**
   * @template {API.Ability} A
   * @template {API.Caveats} C
   * @param {(...values: API.InferAmplification<M>) => API.CapabilityView<A, C>[]} into
   * @returns {API.CapabilityMatcher<A, C, API.Match<API.CapabilityView<A, C>, API.MatchAmilfication<API.InferAmplificationMatch<M>>>>}
   */

  join(into) {
    return new Join(this, into)
  }
}

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @template {API.Match[]} M
 * @implements {API.CapabilityMatcher<A, C, API.Match<API.CapabilityView<A, C>, API.MatchAmilfication<API.InferAmplificationMatch<M>>>>}
 */
class Join {
  /**
   * @param {API.AmilficationMatcher<API.InferAmplificationMatch<M>>} matchers
   * @param {(...values: API.InferAmplification<M>) => API.CapabilityView<A, C>[]} into
   */
  constructor(matchers, into) {
    this.matchers = matchers
    this.into = into
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.Match<API.CapabilityView<A, C>, API.MatchAmilfication<API.InferAmplificationMatch<M>>>[]}
   */
  match(capabilities) {
    const matches = []
    for (const match of this.matchers.match(capabilities)) {
      for (const capability of this.into(...match.value)) {
        matches.push(new JoinMatch(capability, match))
      }
    }

    return matches
  }
}

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @template {API.Match[]} M
 * @implements {API.Match<API.CapabilityView<A, C>, API.MatchAmilfication<API.InferAmplificationMatch<M>>>}
 */
class JoinMatch {
  /**
   * @param {API.CapabilityView<A, C>} value
   * @param {API.MatchAmilfication<M>} matched
   */
  constructor(value, matched) {
    this.value = value
    this.matched = matched
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.MatchAmilfication<API.InferAmplificationMatch<M>>[]}
   */
  match(capabilities) {
    return this.matched.match(capabilities)
  }
}

/**
 * @template {API.Match[]} M
 * @implements {API.MatchAmilfication<M>}
 */
class MatchAmilpification {
  /**
   * @param {M} matches
   */
  constructor(matches) {
    this.matches = matches
  }
  get value() {
    const value = /** @type {API.InferAmplification<M>} */ (
      this.matches.map(match => match.value)
    )

    Object.defineProperties(this, { value: { value } })
    return value
  }
  /**
   * @param {API.Capability[]} capabilities
   */
  match(capabilities) {
    const matrix = this.matches.map(match => match.match(capabilities))
    const matches = comb(matrix)
    return matches.map(match => new MatchAmilpification(match))
  }
}

export const matcher = /** @type {API.MatcherFactory} */ (
  /**
   * @template {{ can: API.Ability }} T
   * @template {API.Match<{ can: API.Ability }, any>} [M=API.DirectMatch<T>]
   * @param {API.DirectMatcherDescriptor<T> | API.IndirectMatcherDescriptor<T, M>} descriptor
   * @returns {API.Matcher<API.Match<T, M>>}
   */
  descriptor => {
    if (descriptor.delegates) {
      return new Matcher(descriptor)
    } else {
      const matcher =
        /** @type {API.Matcher<API.Match<T, API.DirectMatch<T>>>} */ (
          new DirectMatcher(descriptor)
        )
      return /** @type {API.Matcher<API.Match<T, M>>} */ (matcher)
    }
  }
)

/**
 * @template {API.Group} Members
 * @param {Members} members
 * @returns {API.Matcher<API.GroupMatch<Members>>}
 */
export const group = members => new GroupMatcher(members)

/**
 * @template {{ can: API.Ability }} T
 * @template {API.Match<{ can: API.Ability }, any>} M
 * @param {API.Matcher<M>} matcher
 * @param {API.DeriveDescriptor<T, M>} descriptor
 * @returns {API.Matcher<API.Match<T, M>>}
 */
export const derive = (matcher, { parse, check }) =>
  new Matcher({ parse, check, delegates: matcher })

/**
 * @template {API.Ability} A
 * @template {API.Caveats} C
 * @template {API.Match<{ can: API.Ability }>} M
 * @param {API.Matcher<M>} matcher
 * @param {API.DeriveOptions<A, C, M>} descriptor
 * @returns {API.Matcher<API.CapabilityMatch<A, C, M>>}
 */
export const and = (matcher, descriptor) =>
  new DerivedCapability(descriptor, matcher)

/**
 * @template {API.Match<{ can: API.Ability }, any>} L
 * @template {API.Match<{ can: API.Ability }, any>} R
 * @param {API.Matcher<L>} left
 * @param {API.Matcher<R>} right
 * @returns {API.Matcher<L|R>}
 */
export const or = (left, right) => new OrMatcher(left, right)

/**
 * @template {{ can: API.Ability }} T
 * @template {API.Match<{ can: API.Ability }, any>} M
 * @implements {API.Matcher<API.Match<T, M>>}
 */
class Matcher {
  /**
   * @param {Required<API.IndirectMatcherDescriptor<T, M>>} descriptor
   */
  constructor({ parse, check, delegates }) {
    this.parse = parse
    this.check = check
    this.delegates = delegates
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.Match<T, M>[]}
   */
  match(capabilities) {
    const matches = []
    for (const capability of capabilities) {
      const result = this.parse(capability)
      if (!result.error) {
        matches.push(new Match(result, this.delegates, this))
      }
    }

    return matches
  }

  /**
   * @template {{ can: API.Ability }} E
   * @param {API.DeriveDescriptor<E, API.Match<T, M>>} descriptor
   * @returns {API.Matcher<API.Match<E, API.Match<T, M>>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Match<{ can: API.Ability }, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<API.Match<T, M>|W>}
   */
  or(other) {
    return or(this, other)
  }
}

/**
 * @template {{ can: API.Ability }} T
 * @implements {API.Matcher<API.DirectMatch<T>>}
 * @extends {Matcher<T, API.DirectMatch<T>>}
 */

class DirectMatcher extends Matcher {
  /**
   * @param {API.DirectMatcherDescriptor<T>} descriptor
   */
  constructor(descriptor) {
    super(/** @type {any} */ (descriptor))
    this.delegates = this
  }
}

/**
 * @template {API.Group} Members
 * @implements {API.Matcher<API.GroupMatch<Members>>}
 */
class GroupMatcher {
  /**
   * @param {Members} members
   */
  constructor(members) {
    this.members = members
  }

  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.GroupMatch<Members>[]}
   */
  match(capabilities) {
    const dataset = /** @type {{ [K in keyof Members]: API.Match[] }} */ ({})
    for (const [name, matcher] of entries(this.members)) {
      const matches = matcher.match(capabilities)
      // if any of the members matches no capabilties we won't be able to create
      // any groups, so we exit early
      if (matches.length === 0) {
        return []
      } else {
        dataset[name] = matches
      }
    }

    const matches = /** @type {API.InferGroupMatch<Members>[]} */ (
      combine(dataset)
    )

    /** @type {API.GroupMatch<Members>[]} */
    const results = matches.map(match => new GroupMatch(match))

    return results
  }

  /**
   * @template {{ can: API.Ability }} E
   * @param {API.DeriveDescriptor<E, API.GroupMatch<Members>>} descriptor
   * @returns {API.Matcher<API.Match<E, API.GroupMatch<Members>>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Match<{ can: API.Ability }, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<API.GroupMatch<Members>|W>}
   */
  or(other) {
    return or(this, other)
  }
}

/**
 * @template {API.Match<{ can: API.Ability }, any>} L
 * @template {API.Match<{ can: API.Ability }, any>} R
 * @implements {API.Matcher<L|R>}
 */
class OrMatcher {
  /**
   * @param {API.Matcher<L>} left
   * @param {API.Matcher<R>} right
   */
  constructor(left, right) {
    this.left = left
    this.right = right
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {(L|R)[]}
   */
  match(capabilities) {
    return [...this.left.match(capabilities), ...this.right.match(capabilities)]
  }

  /**
   * @template {{ can: API.Ability }} E
   * @param {API.DeriveDescriptor<E, L|R>} descriptor
   * @returns {API.Matcher<API.Match<E, L|R>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Match<{ can: API.Ability }, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<L|R|W>}
   */
  or(other) {
    return or(this, other)
  }
}
/**
 * @template {Record<string, unknown[]>} T
 * @param {T} dataset
 * @returns {{ [K in keyof T]: T[K][number] }[]}
 */
const combine = dataset => {
  const [[key, seed], ...rest] = entries(dataset)
  const results = seed.map(value => ({ [key]: value }))
  for (const [name, values] of rest) {
    const structs = results.splice(0)
    for (const value of values) {
      for (const struct of structs) {
        results.push({ ...struct, [name]: value })
      }
    }
  }
  return /** @type {any} */ (results)
}

/**
 * @template T
 * @param {T[][]} dataset
 * @returns {T[][]}
 */
const comb = ([first, ...rest]) => {
  const results = first.map(value => [value])
  for (const values of rest) {
    const tuples = results.splice(0)
    for (const value of values) {
      for (const tuple of tuples) {
        results.push([...tuple, value])
      }
    }
  }
  return results
}
/**
 * @template {{ can: API.Ability }} T
 * @template {API.Match<{ can: API.Ability }, any>} M
 * @implements {API.Match<T, M>}
 */
class Match {
  /**
   * @param {T} value
   * @param {API.Matcher<M>} matcher
   * @param {API.Checker<T, M>} checker
   */
  constructor(value, matcher, checker) {
    this.group = /** @type {false} */ (false)
    this.value = value
    this.matcher = matcher
    this.checher = checker
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {M[]}
   */
  match(capabilities) {
    const matches = []
    for (const match of this.matcher.match(capabilities)) {
      if (this.checher.check(this.value, match.value)) {
        matches.push(match)
      }
    }
    return matches
  }
}

/**
 * @template {API.Group} Members
 * @implements {API.GroupMatch<Members>}
 */
class GroupMatch {
  /**
   * @param {API.InferGroupMatch<Members>} matched
   */
  constructor(matched) {
    /** @type {true} */
    this.group = true
    this.matched = matched
  }
  /**
   * @type {API.InferGroupValue<Members>}
   */
  get value() {
    const value = /** @type {any} */ ({})
    for (const [name, match] of entries(this.matched)) {
      value[name] = match.value
    }

    Object.defineProperties(this, { value: { value } })
    return value
  }

  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.GroupMatch<API.InferSubGroup<Members>>[]}
   */
  match(capabilities) {
    const dataset =
      /** @type {{ [K in keyof Members]: API.Match<{ can: API.Ability }, any>[] }} */ ({})
    for (const [name, matched] of entries(this.matched)) {
      const matches = matched.match(capabilities)
      // if any of the members matches no capabilties we won't be able to create
      // any groups, so we exit early
      if (matches.length === 0) {
        return []
      } else {
        dataset[name] = matches
      }
    }

    const matches = /** @type {API.InferGroupMatch<Members>[]} */ (
      combine(dataset)
    )

    return /** @type {API.GroupMatch<API.InferSubGroup<Members>>[]} */ (
      matches.map(match => new GroupMatch(match))
    )
  }
}

/**
 *
 * @template {{}} O
 * @param {O} object
 * @returns {{ [K in keyof O]: [K, O[K]][] }[keyof O]}
 */

const entries = object => /** @type {any} */ (Object.entries(object))

/**
 * @template {NonNullable<unknown>} T
 * @param {T} value
 */
export const ok = value => /** @type {API.Result<T, never>} */ (value)

import * as API from "./api.js"

export const matcher = /** @type {API.MatcherFactory} */ (
  /**
   * @template T
   * @template {API.Match<unknown, any>} [M=API.DirectMatch<T>]
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
 * @template T
 * @template {API.Match<unknown, any>} M
 * @param {API.Matcher<M>} matcher
 * @param {API.DeriveDescriptor<T, M["value"]>} descriptor
 * @returns {API.Matcher<API.Match<T, M>>}
 */
export const derive = (matcher, { parse, check }) =>
  new Matcher({ parse, check, delegates: matcher })

/**
 * @template {API.Match<unknown, any>} L
 * @template {API.Match<unknown, any>} R
 * @param {API.Matcher<L>} left
 * @param {API.Matcher<R>} right
 * @returns {API.Matcher<L|R>}
 */
export const or = (left, right) => new OrMatcher(left, right)

/**
 * @template T
 * @template {API.Match<unknown, any>} M
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
   * @template E
   * @param {API.DeriveDescriptor<E, T>} descriptor
   * @returns {API.Matcher<API.Match<E, API.Match<T, M>>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Match<unknown, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<API.Match<T, M>|W>}
   */
  or(other) {
    return or(this, other)
  }
}

/**
 * @template T
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
    const dataset =
      /** @type {{ [K in keyof Members]: API.Match<unknown, any>[] }} */ ({})
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
   * @template E
   * @param {API.DeriveDescriptor<E, API.GroupMatch<Members>['value']>} descriptor
   * @returns {API.Matcher<API.Match<E, API.GroupMatch<Members>>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Match<unknown, any>} W
   * @param {API.Matcher<W>} other
   * @returns {API.Matcher<API.GroupMatch<Members>|W>}
   */
  or(other) {
    return or(this, other)
  }
}

/**
 * @template {API.Match<unknown, any>} L
 * @template {API.Match<unknown, any>} R
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
   * @template E
   * @param {API.DeriveDescriptor<E, (L|R)['value']>} descriptor
   * @returns {API.Matcher<API.Match<E, L|R>>}
   */
  derive(descriptor) {
    return derive(this, descriptor)
  }

  /**
   * @template {API.Match<unknown, any>} W
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
 * @template {API.Match<unknown, any>} M
 * @implements {API.Match<T, M>}
 */
class Match {
  /**
   * @param {T} value
   * @param {API.Matcher<M>} matcher
   * @param {API.Checker<T, M['value']>} checker
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
      /** @type {{ [K in keyof Members]: API.Match<unknown, any>[] }} */ ({})
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

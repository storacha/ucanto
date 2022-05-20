import * as API from "./api.js"

export const matcher = /** @type {API.MatcherFactory} */ (
  /**
   * @param {API.MatcherDescriptor<unknown, unknown>} descriptor
   */
  descriptor => {
    if (descriptor.delegates) {
      return new Matcher(descriptor)
    } else {
      return new DirectMatcher(descriptor)
    }
  }
)

/**
 * @template {API.Group} Members
 * @param {Members} members
 * @returns {API.GroupMatcher<Members>}
 */
export const group = members => new GroupMatcher(members)

/**
 * @template T
 * @template U
 * @implements {API.Matcher<API.MatchMember<T, U>>}
 */
class Matcher {
  /**
   * @param {Required<API.IndirectMatcherDescriptor<T, U>>} descriptor
   */
  constructor({ parse, check, delegates }) {
    this.parse = parse
    this.check = check
    this.delegates = delegates
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.MatchMember<T, U>[]}
   */
  match(capabilities) {
    const matches = []
    for (const capability of capabilities) {
      const result = this.parse(capability)
      if (!result.error) {
        matches.push(new MatchMember(result, this.delegates, this))
      }
    }

    return matches
  }

  /**
   * @template E
   * @param {API.DeriveDescriptor<E, T>} descriptor
   * @returns {API.Matcher<API.MatchMember<E, T>>}
   */
  derive({ parse, check }) {
    return new Matcher({ parse, check, delegates: this })
  }
}

/**
 * @template T
 * @implements {API.DirectMatcher<T>}
 * @extends {Matcher<T, T>}
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
 * @implements {API.GroupMatcher<Members>}
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
    return matches.map(match => new GroupMatch(match))
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
 * @template T, U
 * @template {API.Matcher<API.Match<U>>} M
 * @implements {API.MatchMember<T, U>}
 */
class MatchMember {
  /**
   *
   * @param {T} value
   * @param {M} matcher
   * @param {API.Checker<T, U>} checker
   */
  constructor(value, matcher, checker) {
    this.group = /** @type {false} */ (false)
    this.value = value
    this.matcher = matcher
    this.checher = checker
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.Match<U>[]}
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

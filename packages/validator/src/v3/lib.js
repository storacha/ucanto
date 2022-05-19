import * as API from "./api.js"

/**
 * @template T
 * @template [U=T]
 * @template {API.Matcher<API.Match<U>>} [M=API.DirectMatcher<U>]
 * @param {API.MatcherDescriptor<T, M>} descriptor
 * @returns {API.Matcher<API.MatchMember<T, U, M>>}
 */
export const matcher = ({ delegates, ...descriptor }) => {
  if (delegates) {
    return new Matcher({ delegates, ...descriptor })
  } else {
    /** @type {API.DirectMatcher<T | U>} */
    const matcher = new DirectMatcher(descriptor)
    return /** @type {API.Matcher<API.MatchMember<T, U, M>>} */ (matcher)
  }
}

/**
 * @template {API.Group} Members
 * @param {Members} members
 * @returns {API.GroupMatcher<Members>}
 */
export const group = members => new GroupMatcher(members)

/**
 * @template T
 * @template U
 * @template {API.Matcher<API.Match<U>>} M
 * @implements {API.Matcher<API.MatchMember<T, U, M>>}
 */
class Matcher {
  /**
   * @param {Required<API.MatcherDescriptor<T, M>>} descriptor
   */
  constructor({ parse, check, delegates }) {
    this.parse = parse
    this.check = check
    this.delegates = delegates
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {API.MatchMember<T, U, M>[]}
   */
  match(capabilities) {
    const matches = []
    for (const capability of capabilities) {
      const result = this.parse(capability)
      if (!result.error) {
        matches.push(new MatchMember(result, this.delegates))
      }
    }

    return matches
  }
}

/**
 * @template T
 * @implements {API.DirectMatcher<T>}
 * @extends {Matcher<T, T, API.DirectMatcher<T>>}
 */

class DirectMatcher extends Matcher {
  /**
   * @param {API.MatcherDescriptor<T, never>} descriptor
   */
  constructor(descriptor) {
    super(/** @type {Required<API.MatcherDescriptor<T, never>>} */ (descriptor))
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
 * @template {API.Match<U>} N
 * @template {API.Matcher<N>} M
 * @implements {API.MatchMember<T, U, M>}
 */
class MatchMember {
  /**
   *
   * @param {T} value
   * @param {M} matcher
   */
  constructor(value, matcher) {
    this.group = /** @type {false} */ (false)
    this.value = value
    this.matcher = matcher
  }
  /**
   * @param {API.Capability[]} capabilities
   * @returns {N[]}
   */
  match(capabilities) {
    return this.matcher.match(capabilities)
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

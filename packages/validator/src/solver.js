import * as API from "./api.js"
import { the, unreachable } from "./util.js"
import {
  EscalatedClaim,
  EscalationError,
  ConstraintViolationError,
} from "./error.js"

/**
 * Goes over provided capabilities and attempts to find the one that satisfies
 * the claim by finding comparable ones via `config.match` and checking for
 * constraint violations via `config.check` (which is expected to return an
 * array of violated capabilities, if array empty claim is considered to be
 * valid).
 *
 * @template {API.Capability} T
 * @template {API.Capability} U
 * @param {T} claim
 * @param {Array<T|U>} capabilities
 * @param {object} config
 * @param {(claim:T, capability:T|U) => boolean} config.match
 * @param {(claim:T, capability:T) => string[]} config.check
 * @returns {IterableIterator<API.Result<[T], API.EscalationError<T>>>}
 */
export const analyze = function* (claim, capabilities, config) {
  for (const capability of capabilities) {
    if (config.match(claim, capability)) {
      const match = /** @type {T} */ (capability)
      const violations = config.check(claim, match)
      if (violations.length === 0) {
        yield the([match])
      } else {
        yield escaltes(violations, claim, match)
      }
    }
  }
}

/**
 * Finds evidence supporting claimed capability and returns either succesful
 * result containing iterable of evidence or `ClaimError` containing escalation
 * errors.
 *
 * @template {API.Capability} T
 * @template {API.Capability} U
 * @param {T} claim
 * @param {Array<T|U>} capabilities
 * @param {object} config
 * @param {(claim:T, capability:T|U) => boolean} config.match
 * @param {(claim:T, capability:T) => string[]} config.check
 */

export const solve = function (claim, capabilities, config) {
  const analysis = analyze(claim, capabilities, config)
  return check(map(categorize(analysis), proof => evidence(claim, ...proof)))
}

/**
 * @template {API.Capability} T
 * @param {IterableIterator<API.Result<T[], API.EscalationError<T>>>} analysis
 */
function* categorize(analysis) {
  const esclacations = []
  for (const result of analysis) {
    if (result.error) {
      esclacations.push(result)
    } else {
      yield result
    }
  }
  return esclacations
}

/**
 * @template T
 * @param {Generator<API.Evidence<T>, API.EscalationError<T>[]>} evidence
 * @returns {API.Result<IterableIterator<API.Evidence<T>>, API.EscalatedClaim<T>>}
 */
export const check = evidence => {
  const head = evidence.next()
  if (head.done) {
    return new EscalatedClaim(head.value)
  } else {
    return prepend(head.value, evidence)
  }
}

/**
 * @template T
 * @param {T} claim
 * @param {T[]} capabilities
 * @param {(claim:T, capabilities:T[]) => Generator<T, API.EscalationError<T>[]>} checker
 * @returns {API.Result<IterableIterator<API.Evidence<T>>, API.EscalatedClaim<T>>}
 */
export const checkWith = (claim, capabilities, checker) =>
  check(map(checker(claim, capabilities), proof => evidence(claim, proof)))

/**
 * @template T, U, R
 * @param {Generator<T, R>} source
 * @param {(value:T) => U} f
 * @returns {Generator<U, R>}
 */
function* map(source, f) {
  while (true) {
    const next = source.next()
    if (next.done) {
      return next.value
    } else {
      yield f(next.value)
    }
  }
}

/**
 * @template T
 * @param {T} first
 * @param {IterableIterator<T>} rest
 */
export function* prepend(first, rest) {
  yield first
  yield* rest
}

/**
 * @template T
 * @param {T} claimed
 * @param {T[]} capabilities
 * @returns {API.Evidence<T>}
 */
export const evidence = (claimed, ...capabilities) =>
  new Evidence(claimed, capabilities)

/**
 * @template T
 */
class Evidence {
  /**
   * @param {T} claimed
   * @param {T[]} capabilities
   */
  constructor(claimed, capabilities) {
    this.claimed = claimed
    this.capabilities = capabilities
  }
}

/**
 * @template {API.Capability} C
 * @param {string[]} constraints
 * @param {C} claim
 * @param {C} capability
 * @returns {API.EscalationError<C>}
 */

export const escaltes = (constraints, claim, capability) => {
  const violations = []
  for (const constraint of constraints) {
    violations.push(violates(constraint, claim, capability))
  }
  return new EscalationError(claim, capability, violations)
}

/**
 * @template {API.Capability} C
 * @param {string} name
 * @param {C} claimed
 * @param {C} violated
 * @returns {API.ConstraintViolationError<C>}
 */
export const violates = (name, claimed, violated) =>
  new ConstraintViolationError(
    new Constraint(claimed, name, claimed[name]),
    new Constraint(violated, name, violated[name])
  )

/**
 * @template C
 */
class Constraint {
  /**
   * @param {C} capability
   * @param {string} name
   * @param {unknown} value
   */
  constructor(capability, name, value) {
    this.capability = capability
    this.name = name
    this.value = value
  }
}

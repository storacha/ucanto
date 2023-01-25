import * as API from '@ucanto/interface'
import { entries, combine, intersection } from './util.js'
import {
  EscalatedCapability,
  MalformedCapability,
  UnknownCapability,
  DelegationError as MatchError,
  Failure,
} from './error.js'
import { invoke, delegate } from '@ucanto/core'

/**
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} [C={}]
 * @param {API.Descriptor<A, R, C>} descriptor
 * @returns {API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>}
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
 * @returns {API.TheCapabilityParser<API.DerivedMatch<T, M>>}
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
  /* c8 ignore next 3 */
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
   * @returns {API.TheCapabilityParser<API.DerivedMatch<U, M>>}
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
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @implements {API.TheCapabilityParser<API.DirectMatch<API.ParsedCapability<A, R, API.InferCaveats<C>>>>}
 * @extends {Unit<API.DirectMatch<API.ParsedCapability<A, R, API.InferCaveats<C>>>>}
 */
class Capability extends Unit {
  /**
   * @param {API.Descriptor<A, R, C>} descriptor
   */
  constructor(descriptor) {
    super()
    this.descriptor = { derives, ...descriptor }
  }

  /**
   * @param {unknown} source
   */
  read(source) {
    try {
      const result = this.create(/** @type {any} */ (source))
      return /** @type {API.Result<API.ParsedCapability<A, R, API.InferCaveats<C>>, API.Failure>} */ (
        result
      )
    } catch (error) {
      return /** @type {any} */ (error).cause
    }
  }

  /**
   * @param {API.InferCreateOptions<R, API.InferCaveats<C>>} options
   */
  create(options) {
    const { descriptor, can } = this
    const decoders = descriptor.nb
    const data = /** @type {API.InferCaveats<C>} */ (options.nb || {})

    const resource = descriptor.with.read(options.with)
    if (resource.error) {
      throw Object.assign(new Error(`Invalid 'with' - ${resource.message}`), {
        cause: resource,
      })
    }

    const capabality =
      /** @type {API.ParsedCapability<A, R, API.InferCaveats<C>>} */
      ({ can, with: resource })

    for (const [name, decoder] of Object.entries(decoders || {})) {
      const key = /** @type {keyof data & string} */ (name)
      const value = decoder.read(data[key])
      if (value?.error) {
        throw Object.assign(
          new Error(`Invalid 'nb.${key}' - ${value.message}`),
          { cause: value }
        )
      } else if (value !== undefined) {
        const nb =
          capabality.nb ||
          (capabality.nb = /** @type {API.InferCaveats<C>} */ ({}))

        const key = /** @type {keyof nb} */ (name)
        nb[key] = /** @type {typeof nb[key]} */ (value)
      }
    }

    return capabality
  }

  /**
   * @param {API.InferInvokeOptions<R, API.InferCaveats<C>>} options
   */
  invoke({ with: with_, nb, ...options }) {
    return invoke({
      ...options,
      capability: this.create(
        /** @type {API.InferCreateOptions<R, API.InferCaveats<C>>} */
        ({ with: with_, nb })
      ),
    })
  }

  /**
   * @param {API.InferDelegationOptions<R, API.InferCaveats<C>>} options
   */
  async delegate({ with: with_, nb, ...options }) {
    const { descriptor, can } = this
    const readers = descriptor.nb
    const data = /** @type {API.InferCaveats<C>} */ (nb || {})

    const resource = descriptor.with.read(with_)
    if (resource.error) {
      throw Object.assign(new Error(`Invalid 'with' - ${resource.message}`), {
        cause: resource,
      })
    }

    const capabality =
      /** @type {API.ParsedCapability<A, R, API.InferCaveats<C>>} */
      ({ can, with: resource })

    for (const [name, reader] of Object.entries(readers || {})) {
      const key = /** @type {keyof data & string} */ (name)
      const source = data[key]
      // omit undefined fields in the delegation
      const value = source === undefined ? source : reader.read(data[key])
      if (value?.error) {
        throw Object.assign(
          new Error(`Invalid 'nb.${key}' - ${value.message}`),
          { cause: value }
        )
      } else if (value !== undefined) {
        const nb =
          capabality.nb ||
          (capabality.nb = /** @type {API.InferCaveats<C>} */ ({}))

        const key = /** @type {keyof nb} */ (name)
        nb[key] = /** @type {typeof nb[key]} */ (value)
      }
    }

    return await delegate({
      capabilities: [capabality],
      ...options,
    })
  }

  get can() {
    return this.descriptor.can
  }

  /**
   * @type {API.Reader<R>}
   */

  get with() {
    return this.descriptor.with
  }

  /**
   * @param {API.Source} source
   * @returns {API.MatchResult<API.DirectMatch<API.ParsedCapability<A, R, API.InferCaveats<C>>>>}
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
        return right.name === 'MalformedCapability'
          ? //
            right
          : //
            left
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
    return `[${this.selectors.map(String).join(', ')}]`
  }
}

/**
 * @template {API.ParsedCapability} T
 * @template {API.Match} M
 * @implements {API.TheCapabilityParser<API.DerivedMatch<T, M>>}
 * @extends {Unit<API.DerivedMatch<T, M>>}
 */

class Derive extends Unit {
  /**
   * @param {API.MatchSelector<M>} from
   * @param {API.TheCapabilityParser<API.DirectMatch<T>>} to
   * @param {API.Derives<API.ToDeriveClaim<T>, API.ToDeriveProof<M['value']>>} derives
   */
  constructor(from, to, derives) {
    super()
    this.from = from
    this.to = to
    this.derives = derives
  }

  /**
   * @param {unknown} source
   */
  read(source) {
    return this.to.read(source)
  }

  /**
   * @type {typeof this.to['create']}
   */
  create(options) {
    return this.to.create(options)
  }
  /**
   * @type {typeof this.to['invoke']}
   */
  invoke(options) {
    return this.to.invoke(options)
  }
  /**
   * @type {typeof this.to['delegate']}
   */
  delegate(options) {
    return this.to.delegate(options)
  }
  get can() {
    return this.to.can
  }
  get with() {
    return this.to.with
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
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @implements {API.DirectMatch<API.ParsedCapability<A, R, API.InferCaveats<C>>>}
 */
class Match {
  /**
   * @param {API.Source} source
   * @param {API.ParsedCapability<A, R, API.InferCaveats<C>>} value
   * @param {API.Descriptor<A, R, C>} descriptor
   */
  constructor(source, value, descriptor) {
    this.source = [source]
    this.value = value
    this.descriptor = { derives, ...descriptor }
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
   * @returns {API.DirectMatch<API.ParsedCapability<A, R, API.InferCaveats<C>>>|null}
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
   * @returns {API.Select<API.DirectMatch<API.ParsedCapability<A, R, API.InferCaveats<C>>>>}
   */
  select(capabilities) {
    const unknown = []
    const errors = []
    const matches = []
    for (const capability of capabilities) {
      const result = parse(this, capability, true)
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
          case 'UnknownCapability':
            unknown.push(result.capability)
            break
          case 'MalformedCapability':
          default:
            errors.push(new MatchError([result], this))
        }
      }
    }

    return { matches, unknown, errors }
  }
  toString() {
    const { nb } = this.value
    return JSON.stringify({
      can: this.descriptor.can,
      with: this.value.with,
      nb: nb && Object.keys(nb).length > 0 ? nb : undefined,
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
   * @param {API.Derives<API.ToDeriveClaim<T>, API.ToDeriveProof<M['value']>>} derives
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

    Object.defineProperties(this, { proofs: { value: proofs } })
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
    return `[${this.matches.map(match => match.toString()).join(', ')}]`
  }
}

/**
 * Parses capability `source` using a provided capability `parser`. By default
 * invocation parsing occurs, which respects a capability schema, failing if
 * any non-optional field is missing. If `optional` argument is `true` it will
 * parse capability as delegation, in this case all `nb` fields are considered
 * optional.
 *
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @param {{descriptor: API.Descriptor<A, R, C>}} parser
 * @param {API.Source} source
 * @param {boolean} [optional=false]
 * @returns {API.Result<API.ParsedCapability<A, R, API.InferCaveats<C>>, API.InvalidCapability>}
 */

const parse = (parser, source, optional = false) => {
  const { can, with: withReader, nb: readers } = parser.descriptor
  const { delegation } = source
  const capability = /** @type {API.Capability<A, R, API.InferCaveats<C>>} */ (
    source.capability
  )

  if (capability.can !== can) {
    return new UnknownCapability(capability)
  }

  const uri = withReader.read(capability.with)
  if (uri.error) {
    return new MalformedCapability(capability, uri)
  }

  const nb = /** @type {API.InferCaveats<C>} */ ({})

  if (readers) {
    /** @type {Partial<API.InferCaveats<C>>} */
    const caveats = capability.nb || {}
    for (const [name, reader] of entries(readers)) {
      const key = /** @type {keyof caveats & keyof nb & string} */ (name)
      if (key in caveats || !optional) {
        const result = reader.read(caveats[key])
        if (result?.error) {
          return new MalformedCapability(capability, result)
        } else if (result != null) {
          nb[key] = /** @type {any} */ (result)
        }
      }
    }
  }

  return new CapabilityView(can, capability.with, nb, delegation)
}

/**
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template C
 */
class CapabilityView {
  /**
   * @param {A} can
   * @param {R} with_
   * @param {API.InferCaveats<C>} nb
   * @param {API.Delegation} delegation
   */
  constructor(can, with_, nb, delegation) {
    this.can = can
    this.with = with_
    this.delegation = delegation
    this.nb = nb
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
        case 'UnknownCapability':
          unknown.push(result.capability)
          break
        case 'MalformedCapability':
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
    unknown:
      /* c8 ignore next */
      unknown || [],
    errors,
    matches,
  }
}

/**
 * @template {API.ParsedCapability} T
 * @template {API.ParsedCapability} U
 * @param {T} claimed
 * @param {U} delegated
 * @return {API.Result<true, API.Failure>}
 */
const derives = (claimed, delegated) => {
  if (delegated.with.endsWith('*')) {
    if (!claimed.with.startsWith(delegated.with.slice(0, -1))) {
      return new Failure(
        `Resource ${claimed.with} does not match delegated ${delegated.with} `
      )
    }
  } else if (delegated.with !== claimed.with) {
    return new Failure(
      `Resource ${claimed.with} is not contained by ${delegated.with}`
    )
  }

  /* c8 ignore next 2 */
  const caveats = delegated.nb || {}
  const nb = claimed.nb || {}
  const kv = entries(caveats)

  for (const [name, value] of kv) {
    if (nb[name] != value) {
      return new Failure(`${String(name)}: ${nb[name]} violates ${value}`)
    }
  }

  return true
}

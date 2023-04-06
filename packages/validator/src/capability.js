import * as API from '@ucanto/interface'
import { entries, combine, intersection } from './util.js'
import {
  EscalatedCapability,
  MalformedCapability,
  UnknownCapability,
  DelegationError as MatchError,
} from './error.js'
import { invoke, delegate, Schema } from '@ucanto/core'

/**
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @typedef {{
 * can: A
 * with: API.Reader<R, API.Resource, API.Failure>
 * nb?: Schema.MapRepresentation<C, unknown>
 * derives?: (claim: {can:A, with: R, nb: C}, proof:{can:A, with:R, nb:C}) => API.Result<{}, API.Failure>
 * }} Descriptor
 */

/**
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} [C={}]
 * @param {Descriptor<A, R, C>} descriptor
 
 * @returns {API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>}
 */
export const capability = ({
  derives = defaultDerives,
  nb = defaultNBSchema,
  ...etc
}) => new Capability({ derives, nb, ...etc })

const defaultNBSchema =
  /** @type {Schema.MapRepresentation<any>} */
  (Schema.struct({}))

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
 * @param {object} source
 * @param {API.MatchSelector<M>} source.from
 * @param {API.TheCapabilityParser<API.DirectMatch<T>>} source.to
 * @param {API.Derives<T, API.InferDeriveProof<M['value']>>} source.derives
 
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
    return { error: new UnknownCapability(source.capability) }
  }

  /**
   * @param {API.Source[]} capabilities
   * @returns {API.Select<M>}
   */
  select(capabilities) {
    return select(this, capabilities)
  }

  /**
   * @template {API.ParsedCapability} U
   * @param {object} source
   * @param {API.TheCapabilityParser<API.DirectMatch<U>>} source.to
   * @param {API.Derives<U, API.InferDeriveProof<M['value']>>} source.derives
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
 * @implements {API.TheCapabilityParser<API.DirectMatch<API.ParsedCapability<A, R, C>>>}
 * @extends {Unit<API.DirectMatch<API.ParsedCapability<A, R, C>>>}
 */
class Capability extends Unit {
  /**
   * @param {Required<Descriptor<A, R, C>>} descriptor
   */
  constructor(descriptor) {
    super()
    this.descriptor = descriptor
    this.schema = Schema.struct({
      can: Schema.literal(descriptor.can),
      with: descriptor.with,
      nb: descriptor.nb,
    })
  }

  /**
   * @param {API.InferCreateOptions<R, C>} options
   */
  create(options) {
    const { descriptor, can } = this
    const decoders = descriptor.nb
    const data = /** @type {C} */ (options.nb || {})

    const resource = descriptor.with.read(options.with)
    if (resource.error) {
      throw Object.assign(
        new Error(`Invalid 'with' - ${resource.error.message}`),
        {
          cause: resource,
        }
      )
    }

    const nb = descriptor.nb.read(data)
    if (nb.error) {
      throw Object.assign(new Error(`Invalid 'nb' - ${nb.error.message}`), {
        cause: nb,
      })
    }

    return createCapability({ can, with: resource.ok, nb: nb.ok })
  }

  /**
   * @param {API.InferInvokeOptions<R, C>} options
   */
  invoke({ with: with_, nb, ...options }) {
    return invoke({
      ...options,
      capability: this.create(
        /** @type {API.InferCreateOptions<R, C>} */
        ({ with: with_, nb })
      ),
    })
  }

  /**
   * @param {API.InferDelegationOptions<R, C>} options
   * @returns {Promise<API.Delegation<[API.InferDelegatedCapability<API.ParsedCapability<A, R, C>>]>>}
   */
  async delegate({ nb: input = {}, with: with_, ...options }) {
    const { descriptor, can } = this
    const readers = descriptor.nb

    const resource = descriptor.with.read(with_)
    if (resource.error) {
      throw Object.assign(
        new Error(`Invalid 'with' - ${resource.error.message}`),
        {
          cause: resource,
        }
      )
    }

    const nb = descriptor.nb.partial().read(input)
    if (nb.error) {
      throw Object.assign(new Error(`Invalid 'nb' - ${nb.error.message}`), {
        cause: nb,
      })
    }

    return delegate({
      capabilities: [createCapability({ can, with: resource.ok, nb: nb.ok })],
      ...options,
    })
  }

  get can() {
    return this.descriptor.can
  }

  /**
   * @param {API.Source} source
   * @returns {API.MatchResult<API.DirectMatch<API.ParsedCapability<A, R, C>>>}
   */
  match(source) {
    const result = parseCapability(this.descriptor, source)
    return result.error
      ? result
      : { ok: new Match(source, result.ok, this.descriptor) }
  }
  toString() {
    return JSON.stringify({ can: this.descriptor.can })
  }
}

/**
 * Normalizes capability by removing empty nb field.
 *
 * @template {API.ParsedCapability} T
 * @param {T} source
 */

const createCapability = ({ can, with: with_, nb }) =>
  /** @type {API.InferCapability<T>} */ ({
    can,
    with: with_,
    ...(isEmpty(nb) ? {} : { nb }),
  })

/**
 * @param {object} object
 * @returns {object is {}}
 */
const isEmpty = object => {
  for (const _ in object) {
    return false
  }
  return true
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
        return right.error.name === 'MalformedCapability'
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
        group.push(result.ok)
      }
    }

    return {
      ok: new AndMatch(/** @type {API.InferMembers<Selectors>} */ (group)),
    }
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
   * @param {API.Derives<T, API.InferDeriveProof<M['value']>>} derives
   */
  constructor(from, to, derives) {
    super()
    this.from = from
    this.to = to
    this.derives = derives
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
  /**
   * @param {API.Source} capability
   * @returns {API.MatchResult<API.DerivedMatch<T, M>>}
   */
  match(capability) {
    const match = this.to.match(capability)
    if (match.error) {
      return match
    } else {
      return { ok: new DerivedMatch(match.ok, this.from, this.derives) }
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
 * @implements {API.DirectMatch<API.ParsedCapability<A, R, C>>}
 */
class Match {
  /**
   * @param {API.Source} source
   * @param {API.ParsedCapability<A, R, C>} value
   * @param {Required<Descriptor<A, R, C>>} descriptor
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
   * @returns {API.DirectMatch<API.ParsedCapability<A, R, C>>|null}
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
   * @returns {API.Select<API.DirectMatch<API.ParsedCapability<A, R, C>>>}
   */
  select(capabilities) {
    const unknown = []
    const errors = []
    const matches = []
    for (const capability of capabilities) {
      const result = resolveCapability(this.descriptor, this.value, capability)
      if (result.ok) {
        const claim = this.descriptor.derives(this.value, result.ok)
        if (claim.error) {
          errors.push(
            new MatchError(
              [new EscalatedCapability(this.value, result.ok, claim.error)],
              this
            )
          )
        } else {
          matches.push(new Match(capability, result.ok, this.descriptor))
        }
      } else {
        switch (result.error.name) {
          case 'UnknownCapability':
            unknown.push(result.error.capability)
            break
          case 'MalformedCapability':
          default:
            errors.push(new MatchError([result.error], this))
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
   * @param {API.Derives<T, API.InferDeriveProof<M['value']>>} derives
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
            [new EscalatedCapability(value, match.value, result.error)],
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
 * Resolves ability `pattern` of the delegated capability from the ability
 * of the claimed capability. If pattern matches returns claimed ability
 * otherwise returns given `fallback`.
 *
 * @example
 * ```js
 * resolveAbility('*', 'store/add', null) // => 'store/add'
 * resolveAbility('store/*', 'store/add', null) // => 'store/add'
 * resolveAbility('store/add', 'store/add', null) // => 'store/add'
 * resolveAbility('store/', 'store/add', null) // => null
 * resolveAbility('store/a*', 'store/add', null) // => null
 * resolveAbility('store/list', 'store/add', null) // => null
 * ```
 *
 * @template {API.Ability} T
 * @template U
 * @param {string} pattern
 * @param {T} can
 * @param {U} fallback
 * @returns {T|U}
 */
const resolveAbility = (pattern, can, fallback) => {
  switch (pattern) {
    case can:
    case '*':
      return can
    default:
      return pattern.endsWith('/*') && can.startsWith(pattern.slice(0, -1))
        ? can
        : fallback
  }
}

/**
 * Resolves `source` resource of the delegated capability from the resource
 * `uri` of the claimed capability. If `source` is `"ucan:*""` or matches `uri`
 * then it returns `uri` back otherwise it returns `fallback`.
 *
 * @example
 * ```js
 * resolveResource('ucan:*', 'did:key:zAlice', null) // => 'did:key:zAlice'
 * resolveAbility('ucan:*', 'https://example.com', null) // => 'https://example.com'
 * resolveAbility('did:*', 'did:key:zAlice', null) // => null
 * resolveAbility('did:key:zAlice', 'did:key:zAlice', null) // => did:key:zAlice
 * ```
 * @template {string} T
 * @template U
 * @param {T} uri
 * @param {string} source
 * @param {U} fallback
 * @returns {T|U}
 */
const resolveResource = (source, uri, fallback) => {
  switch (source) {
    case uri:
    case 'ucan:*':
      return uri
    default:
      return fallback
  }
}

/**
 * Parses capability from the `source` using a provided `parser`.
 *
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @param {Required<Descriptor<A, R, C>>} descriptor
 * @param {API.Source} source
 * @returns {API.Result<API.ParsedCapability<A, R, C>, API.InvalidCapability>}
 */
const parseCapability = (descriptor, source) => {
  const { delegation } = source
  const capability = /** @type {API.Capability<A, R, C>} */ (source.capability)

  if (descriptor.can !== capability.can) {
    return { error: new UnknownCapability(capability) }
  }

  const uri = descriptor.with.read(capability.with)
  if (uri.error) {
    return { error: new MalformedCapability(capability, uri.error) }
  }

  const nb = descriptor.nb.read(capability.nb || {})
  if (nb.error) {
    return { error: new MalformedCapability(capability, nb.error) }
  }

  return { ok: new CapabilityView(descriptor.can, uri.ok, nb.ok, delegation) }
}

/**
 * Resolves delegated capability `source` from the `claimed` capability using
 * provided capability `parser`. It is similar to `parseCapability` except
 * `source` here is treated as capability pattern which is matched against the
 * `claimed` capability. This means we resolve `can` and `with` fields from the
 * `claimed` capability and inherit all missing `nb` fields from the claimed
 * capability.
 *
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.Caveats} C
 * @param {Required<Descriptor<A, R, C>>} descriptor
 * @param {API.ParsedCapability<A, R, C>} claimed
 * @param {API.Source} source
 * @returns {API.Result<API.ParsedCapability<A, R, C>, API.InvalidCapability>}
 */

const resolveCapability = (descriptor, claimed, { capability, delegation }) => {
  const can = resolveAbility(capability.can, claimed.can, null)
  if (can == null) {
    return { error: new UnknownCapability(capability) }
  }

  const resource = resolveResource(
    capability.with,
    claimed.with,
    capability.with
  )
  const uri = descriptor.with.read(resource)
  if (uri.error) {
    return { error: new MalformedCapability(capability, uri.error) }
  }

  const nb = descriptor.nb.read({
    ...claimed.nb,
    ...capability.nb,
  })

  if (nb.error) {
    return { error: new MalformedCapability(capability, nb.error) }
  }

  return { ok: new CapabilityView(can, uri.ok, nb.ok, delegation) }
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
   * @param {C} nb
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
 * @returns {API.Select<M>}
 */

const select = (matcher, capabilities) => {
  const unknown = []
  const matches = []
  const errors = []
  for (const capability of capabilities) {
    const result = matcher.match(capability)
    if (result.error) {
      switch (result.error.name) {
        case 'UnknownCapability':
          unknown.push(result.error.capability)
          break
        case 'MalformedCapability':
        default:
          errors.push(new MatchError([result.error], result.error.capability))
      }
    } else {
      matches.push(result.ok)
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
const defaultDerives = (claimed, delegated) => {
  if (delegated.with.endsWith('*')) {
    if (!claimed.with.startsWith(delegated.with.slice(0, -1))) {
      return Schema.error(
        `Resource ${claimed.with} does not match delegated ${delegated.with} `
      )
    }
  } else if (delegated.with !== claimed.with) {
    return Schema.error(
      `Resource ${claimed.with} is not contained by ${delegated.with}`
    )
  }

  /* c8 ignore next 2 */
  const caveats = delegated.nb || {}
  const nb = claimed.nb || {}
  const kv = entries(caveats)

  for (const [name, value] of kv) {
    if (nb[name] != value) {
      return Schema.error(`${String(name)}: ${nb[name]} violates ${value}`)
    }
  }

  return { ok: true }
}

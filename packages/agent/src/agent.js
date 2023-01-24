import * as API from '../src/api.js'
import { Schema, URI } from '@ucanto/validator'

export const fail = Schema.struct({ error: true })

/**
 * Creates a schema for the task result by specifying ok and error types
 *
 * @template T
 * @template {{}} [X={message:string}]
 * @param {Schema.Reader<T>} ok
 * @param {Schema.Reader<X>} error
 * @returns {Schema.Schema<API.Result<T & {error?: undefined}, X & { error: true }>>}
 */
export const result = (
  ok,
  error = Schema.struct({ message: Schema.string() })
) =>
  Schema.or(
    /** @type {Schema.Reader<T & {error?:never}>} */ (ok),
    fail.and(error)
  )

/**
 * @template {API.CreateTask} Create
 * @param {Create} options
 * @returns {API.Task<Create['in'] extends Schema.Reader<infer T> ? T : void, Schema.Infer<Create['out']> & { error?: never}, Schema.Infer<Create['out']> & { error: true}>}
 */
export const task = options =>
  /** @type {any} */ ({
    in: options.in,
    out: options.out,
  })

/**
 * @template {API.URI} URI
 * @template {API.ResourceAbilities} Abilities
 * @param {API.Reader<URI>} resource
 * @param {Abilities} abilities
 * @returns {API.Resource<URI, Abilities, {}>}
 */
export const resource = (resource, abilities) => {
  return new Resource({ resource, abilities, context: {} })
}

/**
 * @template {API.URI} URI
 * @template {API.ResourceAbilities} Abilities
 * @template {{}} Context
 */

class Resource {
  /**
   * @type {{new <T extends {uri: API.URI}> (state:T): API.From<T['uri'], '', Abilities> }|undefined}
   */
  #API

  /**
   * @param {object} source
   * @param {API.Reader<URI>} source.resource
   * @param {Abilities} source.abilities
   * @param {Context} source.context
   */
  constructor(source) {
    this.source = source
  }
  get abilities() {
    return this.source.abilities
  }

  /**
   * @template {URI} At
   * @param {At} at
   * @returns {API.From<At, '', Abilities>},
   */
  from(at) {
    const uri = this.source.resource.read(at)
    if (uri.error) {
      throw uri
    }

    if (!this.#API) {
      this.#API = gen('', this.source.abilities)
    }

    return new this.#API({ uri: /** @type {At} */ (uri) })
  }
  /**
   * @template Q
   * @param {Q} query
   * @returns {API.Batch<Q>}
   */
  query(query) {
    throw 'query'
  }
  /**
   * @template ContextExt
   * @param {ContextExt} context
   * @returns {Resource<URI, Abilities, Context & ContextExt>}
   */
  with(context) {
    return new Resource({
      ...this.source,
      context: { ...this.source.context, ...context },
    })
  }

  /**
   * @template {API.URI} URIExt
   * @template {API.ResourceAbilities} AbilitiesExt
   * @template {{}} ContextExt
   * @param {Resource<URIExt, AbilitiesExt, ContextExt>} other
   * @returns {Resource<URI | URIExt, Abilities & AbilitiesExt, Context & ContextExt>}
   */
  and(other) {
    return new Resource({
      resource: Schema.or(this.source.resource, other.source.resource),
      context: { ...this.source.context, ...other.source.context },
      // we need to actually merge these
      abilities: { ...this.source.abilities, ...other.source.abilities },
    })
  }

  // /**
  //  * @template {API.ProviderOf<Abilities, Context>} Provider
  //  * @param {Provider} provider
  //  */
  // provide(provider) {

  // }
}

/**
 * @template {API.ResourceAbilities} Abilities
 * @param {string} at
 * @param {Abilities} abilities
 * @returns {{new <T extends {uri: API.URI}> (state:T): API.From<T['uri'], '', Abilities> }}
 */

const gen = (at, abilities) => {
  /**
   * @template {{ uri: API.URI }} State
   */
  class ResourceAPI {
    /**
     * @param {State} state
     */
    constructor(state) {
      this.state = state
    }
  }

  /** @type {PropertyDescriptorMap} */
  const descriptor = {}

  for (const [key, source] of Object.entries(abilities)) {
    const path = `${at}/${key}`
    if (isReader(source)) {
      descriptor[key] = {
        value: function () {
          return new Selector(this.state, { path, schema: source })
          // Object.defineProperty(this, key, { value: selector })
          // return selector
        },
      }
    } else if (isTask(source)) {
      descriptor[key] = {
        value: function (input) {
          return new TaskSelector({
            with: this.state.uri,
            path,
            schema: source,
            input,
            in: source.in.read(input),
          })
          // Object.defineProperty(this, key, { value: selector })
          // return selector
        },
      }
    } else {
      const SubAPI = gen(path, source)
      descriptor[key] = {
        get: function () {
          const selector = new SubAPI(this.state)
          Object.defineProperty(this, key, { value: selector })
          return selector
        },
      }
    }
  }

  Object.defineProperties(ResourceAPI.prototype, descriptor)

  return /** @type {any} */ (ResourceAPI)
}

class Selector {
  /**
   * @param {{ uri: API.URI }} state
   */
  constructor(state, { path, source }) {
    this.path = path
    this.source = source
    this.state = state
  }
}

class TaskSelector {
  /**
   * @param {object} state
   */
  constructor(source) {
    this.source = source
  }

  get with() {
    return this.source.with
  }
  get can() {
    return this.source.path.slice(1)
  }
  get in() {
    return this.source.in
  }
}

/**
 * @template {API.Reader} Reader
 * @param {Reader|unknown} value
 * @returns {value is Reader}
 */
const isReader = value =>
  value != null &&
  typeof value === 'object' &&
  'read' in value &&
  typeof value.read === 'function'

/**
 * @template {API.Task} Task
 * @param {Task|unknown} value
 * @returns {value is Task}
 */
const isTask = value =>
  value != null &&
  typeof value === 'object' &&
  'in' in value &&
  isReader(value.in) &&
  'out' in value &&
  isReader(value.out)

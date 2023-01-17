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
    mail: options.mail,
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
   * @param {API.Reader<URI>} source.uri
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
   * @param {URI} at
   * @returns {API.From<URI, '', Abilities>},
   */
  from(at) {
    const uri = this.source.uri.read(at)
    if (uri.error) {
      throw uri
    }

    if (!this.#API) {
      this.#API = gen('', this.source.abilities)
    }

    return new this.#API({ uri })
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
      uri: Schema.or(this.source.uri, other.source.uri),
      context: { ...this.source.context, ...other.source.context },
      // we need to actually merge these
      abilities: { ...this.source.abilities, ...other.source.abilities },
    })
  }
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
    #state
    /**
     * @param {State} state
     */
    constructor(state) {
      this.#state = state
    }
  }

  const descriptor = {}

  for (const [key, source] of Object.entries(abilities)) {
    const path = `${at}/key`
    if (isReader(source)) {
      descriptor[key] = {
        get: function () {
          const selector = new Selector(this.#state, { path, source })
          Object.defineProperty(this, key, { value: selector })
          return selector
        },
      }
    } else if (isTask(source)) {
      descriptor[key] = {
        get: function () {
          const selector = new TaskSelector(this.$state, { path, source })
          Object.defineProperty(this, key, { value: selector })
          return selector
        },
      }
    } else {
      const SubAPI = gen(path, source)
      descriptor[key] = {
        get: function () {
          const selector = new SubAPI(this.$state)
          Object.defineProperty(this, key, { value: selector })
          return selector
        },
      }
    }
  }

  Object.defineProperties(ResourceAPI.prototype, descriptor)

  return ResourceAPI
}

/**
 * @template {API.Reader} Reader
 * @param {Reader|unknown} value
 * @returns {value is Reader}
 */
const isReader = value => true

/**
 * @template {API.Task} Task
 * @param {Task|unknown} value
 * @returns {value is Task}
 */
const isTask = value => true

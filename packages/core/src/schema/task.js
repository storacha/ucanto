import * as API from '@ucanto/interface'
import { result } from './result.js'
import * as Schema from './type.js'

/**
 * @template {API.Capability} In - Input of the task, which (currently)
 * corresponds to some capability.
 * @template {{}} Ok - Ok type signifies successful task result. It encodes best
 * practice by requiring empty map extension, this way API changes are rarely
 * backwards incompatible & in most cases could be avoided using new named
 * field.
 * @template {{error:true}} [Error=API.Failure] - Error type signifies failed
 * task result. It simply requires `error: true` field to allow differentiating
 * from Ok type.
 *
 * @param {object} source
 * @param {API.CapabilitySchema<In>} source.in
 * @param {API.Reader<Ok>} source.ok
 * @param {API.Reader<Error>} [source.error]
 * @returns {Schema.Task<In, API.Result<Ok, Error>>}
 */
export const task = source => new Task(source)

/**
 * Class is an implementation of {@link Schema.Task} interface. We use class so
 * we could add some convenience methods.
 *
 * @template {API.Capability} In
 * @template {{}} Ok
 * @template {{error:true}} Error
 */
class Task {
  /**
   * @param {object} source
   * @param {API.CapabilitySchema<In>} source.in
   * @param {API.Reader<Ok>} source.ok
   * @param {API.Reader<Error>} [source.error]
   */
  constructor(source) {
    this.source = source
    this.out = result(source)
  }
  get can() {
    return this.source.in.can
  }
  get with() {
    return this.source.in.with
  }
  get in() {
    return this.source.in
  }
}

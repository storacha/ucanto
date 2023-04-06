import * as API from '@ucanto/interface'

/**
 * @template {API.Ability} Operation
 * @template {API.Resource} Resource
 * @template {API.Caveats} Data
 * @param {Operation} op
 * @param {Resource} uri
 * @param {Data} [input=API.Unit]
 */
export const task = (op, uri, input) =>
  new TaskBuilder({
    op,
    uri,
    input: input || /** @type {Data} */ ({}),
  })

/**
 * @template {API.Ability} Operation
 * @template {API.Resource} Resource
 * @template {API.Caveats} Data
 */
class TaskBuilder {
  /**
   * @param {object} source
   * @param {Operation} source.op
   * @param {Resource} source.uri
   * @param {Data} [source.input]
   * @param {string} [source.nonce]
   */
  constructor({ op, uri, input, nonce = '' }) {
    this.op = op
    this.rsc = uri
    this.input = input
    this.nonce = nonce
  }

  /**
   * @template {API.Caveats} Input
   * @param {object} source
   * @param {Input} [source.input]
   * @param {string} [source.nonce]
   * @returns {TaskBuilder<Operation, Resource, Input & Data>}
   */
  with({ input, nonce }) {
    const { op, rsc } = this

    return new TaskBuilder({
      op,
      uri: rsc,
      input: /** @type {Data & Input} */ ({ ...this.input, ...input }),
      nonce: nonce == null ? this.nonce : nonce,
    })
  }
}

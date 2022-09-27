import * as API from '@ucanto/interface'
import { Failure } from '../error.js'

/**
 * @template T
 * @template Options
 * @implements {API.Decoder<unknown, T, API.Failure>}
 */

class Decoder {
  /**
   * @param {(input:unknown, options:Options) => API.Result<T, API.Failure>} decodeWith
   * @param {Options} options
   * @param {boolean} optional
   */
  constructor(decodeWith, options, optional = false) {
    this.decodeWith = decodeWith
    this.options = options
  }
  /**
   * @param {unknown} input
   */
  decode(input) {
    return this.decodeWith(input, this.options)
  }
  /**
   * @returns {API.Decoder<unknown, undefined|T, API.Failure>}
   */
  get optional() {
    const optional = new OptionalDecoder(this.decodeWith, this.options)
    Object.defineProperties(this, { optional: { value: optional } })
    return optional
  }
}

/**
 * @template Options
 * @template T
 * @implements {API.Decoder<unknown, T|undefined, API.Failure>}
 * @extends {Decoder<T|undefined, Options>}
 */
class OptionalDecoder extends Decoder {
  /**
   * @param {unknown} input
   */
  decode(input) {
    if (input === undefined) {
      return undefined
    } else {
      return this.decodeWith(input, this.options)
    }
  }
}

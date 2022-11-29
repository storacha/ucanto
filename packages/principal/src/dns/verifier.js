import * as API from './type.js'
import { Verifier as KeyVerifier } from '../key.js'

/**
 *
 * @param {API.DID<"dns">} did
 */
const notFound = did => {
  throw new RangeError(`Unable to reslove ${did}`)
}

/**
 * @param {API.DID} source
 * @param {Partial<API.VerifierOptions>} options
 * @returns {API.Verifier}
 */
export const parse = (
  source,
  { parser = KeyVerifier, resolve = notFound } = {}
) => {
  if (!source.startsWith('did:dns:')) {
    throw new RangeError(`Expeted did:dns identifer instead got ${source}`)
  }
  return new Verifier(/** @type {API.DID<'dns'>} */ (source), null, {
    parser,
    resolve,
  })
}

/**
 * @template {number} Code
 * @param {API.DID<"dns">} source
 * @param {API.UCAN.Verifier<"key", Code>} key
 */
export const create = (source, key) => new ResolvedVerifier(source, key)

/**
 * @template {number} Code
 * @implements {API.Verifier<Code>}
 */
class ResolvedVerifier {
  /**
   * @param {API.DID<"dns">} source
   * @param {API.UCAN.Verifier<"key", Code>} inner
   */
  constructor(source, inner) {
    this.source = source
    this.inner = inner
  }
  did() {
    return this.source
  }
  resolve() {
    return this.inner
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Code>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    return this.inner.verify(payload, signature)
  }
}

/**
 * @template {number} Code
 * @implements {API.Verifier<Code>}
 */
class Verifier {
  /**
   * @param {API.DID<"dns">} source
   * @param {API.UCAN.Verifier<"key", Code>|null} key
   * @param {API.VerifierOptions} options
   */
  constructor(source, key, options) {
    this.source = source
    this.options = options
    this.key = key
  }
  did() {
    return this.source
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Code>} signature
   * @returns {API.Await<boolean>}
   */
  verify(payload, signature) {
    if (this.key) {
      return this.key.verify(payload, signature)
    } else {
      return this.resolveAndVerify(payload, signature)
    }
  }

  async resolve() {
    if (!this.key) {
      const did = await this.options.resolve(this.source)
      this.key = /** @type {API.UCAN.Verifier<"key", Code>} */ (
        this.options.parser.parse(did)
      )
    }
    return this.key
  }

  /**
   * @private
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Code>} signature
   * @returns {Promise<boolean>}
   */
  async resolveAndVerify(payload, signature) {
    try {
      const key = await this.resolve()
      return key.verify(payload, signature)
    } catch (_) {
      return false
    }
  }
}

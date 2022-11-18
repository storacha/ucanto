import * as API from './type.js'
import * as Verifier from './verifier.js'
import * as Key from '../key.js'
import * as ed25519 from '../ed25519.js'
import { encodingLength, encodeTo, decode } from '../multiformat.js'

const UTF8Encoder = new TextEncoder()
const UTF8Decoder = new TextDecoder()

// DNS multiaddr code
const CODE = 0x35

/**
 * @param {API.SignerArchive<API.Signer>} archive
 * @param {Partial<API.SignerOptions>} options
 * @returns {API.Signer}
 */
export const from = (
  archive,
  { parser = Key.Verifier, importer = Key.Signer } = {}
) => {
  if (archive instanceof Uint8Array) {
    const codeSize = encodingLength(CODE)
    const [length, lengthSize] = decode(archive, codeSize)
    const offset = codeSize + lengthSize
    const domain = UTF8Decoder.decode(
      new Uint8Array(archive.buffer, offset, length)
    )

    const signer = importer.from(
      new Uint8Array(archive.buffer, offset + length)
    )

    return new Signer(
      /** @type {API.SigningPrincipal<"key">} */ (signer),
      Verifier.create(`did:dns:${domain}`, signer.verifier)
    )
  } else if (!archive.did.startsWith('did:dns:')) {
    throw new RangeError(`Expeted did:dns identifer instead got ${archive.did}`)
  } else if (archive.resolvedDID) {
    const verifier = parser.parse(archive.resolvedDID)
    const signer = /** @type {API.SigningPrincipal<"key">} */ (
      importer.from({
        did: archive.resolvedDID,
        key: archive.key,
      })
    )
    return new Signer(signer, Verifier.create(archive.did, verifier))
  } else {
    throw new RangeError(`did:dns archive expected to have resolveDID field`)
  }
}

/**
 * @template {number} Code
 * @param {string} domain
 * @param {{generate(): API.Await<{ signer: API.SigningPrincipal<'key', Code>, verifier: API.UCAN.Verifier<'key', Code> }>}} generator
 */
export const generate = async (domain, generator = ed25519) =>
  create(domain, await generator.generate())

/**
 * @template {number} Code
 * @param {string} domain
 * @param {object} options
 * @param {API.SigningPrincipal<'key', Code>} options.signer
 * @param {API.UCAN.Verifier<'key', Code>} options.verifier
 */
export const create = (domain, { signer, verifier }) =>
  new Signer(signer, Verifier.create(`did:dns:${domain}`, verifier))

/**
 * @template {number} Code
 * @implements {API.Signer<Code>}
 */
class Signer {
  /**
   * @param {API.SigningPrincipal<'key', Code>} signer
   * @param {API.Verifier<Code>} verifier
   */
  constructor(signer, verifier) {
    this._signer = signer
    this.verifier = verifier
  }
  get signer() {
    return this
  }
  get signatureAlgorithm() {
    return this._signer.signatureAlgorithm
  }
  get signatureCode() {
    return this._signer.signatureCode
  }
  did() {
    return this.verifier.did()
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   */
  sign(payload) {
    return this._signer.sign(payload)
  }
  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, Code>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  /**
   *
   * @returns {API.SignerArchive<API.SigningPrincipal<'dns', Code>>}
   */
  toArchive() {
    const archive = this._signer.toArchive()
    if (archive instanceof Uint8Array) {
      const domain = UTF8Encoder.encode(this.did().slice('did:dns:'.length))

      const codeSize = encodingLength(CODE)
      const lengthSize = encodingLength(domain.length)
      const length = codeSize + lengthSize + domain.length + archive.length
      const bytes = new Uint8Array(length)

      let offset = 0
      encodeTo(CODE, bytes, offset)
      offset += codeSize
      encodeTo(domain.length, bytes, offset)
      offset += lengthSize
      bytes.set(domain, offset)
      offset += domain.length
      bytes.set(archive, offset)

      return bytes
    } else {
      return {
        did: this.did(),
        resolvedDID: archive.did,
        key: archive.key,
      }
    }
  }
}

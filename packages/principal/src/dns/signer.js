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
 * @template {number} Code
 * @param {API.SignerArchive<API.Signer<Code>>} archive
 * @param {Partial<API.SignerOptions>} options
 * @returns {API.Signer<Code>}
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

    const signer = /** @type {API.SigningPrincipal<'key', Code>} */ (
      importer.from(new Uint8Array(archive.buffer, offset + length))
    )

    const verifier = /** @type {API.UCAN.Verifier<'key', Code>} */ (
      parser.parse(signer.did())
    )

    return new Signer(signer, Verifier.create(`did:dns:${domain}`, verifier))
  } else if (!archive.did.startsWith('did:dns:')) {
    throw new RangeError(`Expeted did:dns identifer instead got ${archive.did}`)
  } else if (archive.resolvedDID) {
    const signer = /** @type {API.SigningPrincipal<'key', Code>} */ (
      importer.from({
        did: archive.resolvedDID,
        key: archive.key,
      })
    )
    const verifier = /** @type {API.UCAN.Verifier<'key', Code>} */ (
      parser.parse(archive.resolvedDID)
    )

    return new Signer(signer, Verifier.create(archive.did, verifier))
  } else {
    throw new RangeError(`did:dns archive expected to have resolvedDID field`)
  }
}

/**
 * @template {number} Code
 * @param {string} domain
 * @param {API.SigningPrincipalGenerator<Code>} [generator]
 * @returns {Promise<API.Signer<Code>>}
 */
export const generate = async (
  domain,
  generator = /** @type {API.SigningPrincipalGenerator<any>} */ (ed25519)
) => {
  const signer = await generator.generate()
  return create(domain, signer)
}

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
  /** @type {API.Signer<Code>} */
  get signer() {
    return this
  }

  resolve() {
    return this._signer
  }
  get signatureAlgorithm() {
    return this._signer.signatureAlgorithm
  }
  get signatureCode() {
    return this._signer.signatureCode
  }

  /**
   * @returns {API.DID<'dns'>}
   */
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
   * @returns {API.SignerArchive<this>}
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
        // 🫣 Don't know why TS fails to fails infer this properly.
        did: /** @type {ReturnType<this['did']>} */ (this.did()),
        resolvedDID: archive.did,
        key: archive.key,
      }
    }
  }
}

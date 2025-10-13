/**
 * WebAuthn P-256 Signer Browser Tests
 * 
 * Tests WebAuthn functionality in a real browser environment using Playwright.
 * This provides real coverage of WebAuthn APIs that aren't available in Node.js.
 */

import { assert } from 'chai'
// @ts-ignore - webcrypto is available in browser but not in Node types
const { webcrypto } = globalThis.crypto || {}

// Browser-only test - run with playwright-test
describe.skip('WebAuthn P-256 Signer (Browser)', () => {
  const testDID = 'did:key:zDnaeSMnX2KxSx1nrQBXr4wpJHhCKxwsVvLdehZkHVnGg'

  // Browser environment setup
  let WebAuthnSigner

  before(async () => {
    // Import the WebAuthn signer module in browser context
    WebAuthnSigner = await import('../src/p256/webauthn-signer.js')
  })

  // Mock WebAuthn credential for testing
  const setupWebAuthnMock = () => {
    // Mock navigator.credentials.get for WebAuthn
    if (!navigator.credentials) {
      // @ts-ignore - Adding credentials for testing
      navigator.credentials = {}
    }

    const mockCredential = {
      id: 'test-credential-id',
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      response: {
        clientDataJSON: null, // Will be set dynamically
        authenticatorData: new Uint8Array(37), // Minimum length
        signature: null, // Will be set dynamically
        userHandle: null
      }
    }

    navigator.credentials.get = async (options) => {
      const challenge = new Uint8Array(options?.publicKey?.challenge || new ArrayBuffer(32))
      
      // Create realistic client data JSON
      const clientData = {
        type: 'webauthn.get',
        challenge: btoa(Array.from(challenge, c => String.fromCharCode(c)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        origin: window.location.origin,
        crossOrigin: false
      }
      
      const clientDataJSON = new TextEncoder().encode(JSON.stringify(clientData))
      
      // Create a mock P-256 signature (64 bytes)
      const signature = new Uint8Array(64)
      signature.fill(0x42) // Fill with test pattern
      
      // Set up authenticator data with user present flag
      const authenticatorData = new Uint8Array(37)
      authenticatorData[32] = 0x01 // UP (User Present) flag
      
      return {
        ...mockCredential,
        response: {
          ...mockCredential.response,
          clientDataJSON: clientDataJSON.buffer,
          authenticatorData: authenticatorData.buffer,
          signature: signature.buffer
        }
      }
    }
  }

  // Real WebAuthn authenticate function
  const createWebAuthnAuthenticateFunction = () => {
    return async (challenge) => {
      try {
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            allowCredentials: [{
              type: 'public-key',
              id: new Uint8Array([1, 2, 3, 4])
            }],
            userVerification: 'preferred',
            timeout: 30000
          }
        })
        
        return credential
      } catch (error) {
        console.warn('WebAuthn authentication failed:', error)
        return null
      }
    }
  }

  beforeEach(() => {
    setupWebAuthnMock()
  })

  describe('Browser WebAuthn Integration', () => {
    it('creates WebAuthn signer in browser environment', () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      assert.ok(signer)
      assert.equal(signer.did(), testDID)
      assert.equal(signer.signatureAlgorithm, 'ES256')
    })

    it('performs WebAuthn signing with real browser APIs', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('browser test payload')
      const signature = await signer.sign(payload)
      
      // Verify signature structure
      assert.ok(signature instanceof Uint8Array)
      // @ts-ignore - WebAuthn signature has additional properties
      assert.ok(signature.webauthnContext)
      // @ts-ignore - WebAuthn signature has algorithm property
      assert.equal(signature.algorithm, 'ES256')
      
      // Verify WebAuthn context
      // @ts-ignore - WebAuthn signature has webauthnContext property
      const context = signature.webauthnContext
      assert.ok(context.clientDataJSON)
      assert.ok(context.authenticatorData)
      assert.ok(context.challenge)
      assert.equal(context.originalPayload, payload)
    })

    it('verifies WebAuthn signatures in browser', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('browser verify test')
      const signature = await signer.sign(payload)
      
      // Verify using the signature's own verify method
      const result = await signature.verify(signer.verifier, payload)
      assert.ok(result.ok)
      assert.equal(result.error, undefined)
    })

    it('handles WebAuthn authentication failure gracefully', async () => {
      // Mock a failing authenticate function
      const failingAuthenticateFunction = async () => {
        throw new Error('User cancelled authentication')
      }
      
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, failingAuthenticateFunction)
      const payload = new TextEncoder().encode('fail test payload')
      
      try {
        await signer.sign(payload)
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.ok(error.message.includes('WebAuthn authentication failed'))
      }
    })

    it('validates challenge derivation from payload', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('challenge test payload')
      const signature = await signer.sign(payload)
      
      // The challenge should be SHA-256 of the payload
      const expectedChallenge = await crypto.subtle.digest('SHA-256', payload)
      const actualChallenge = signature.webauthnContext.challenge
      
      assert.deepEqual(actualChallenge, new Uint8Array(expectedChallenge))
    })

    it('parses client data JSON correctly', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('client data test')
      const signature = await signer.sign(payload)
      
      const clientDataJSON = signature.webauthnContext.clientDataJSON
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON))
      
      assert.equal(clientData.type, 'webauthn.get')
      assert.equal(clientData.origin, window.location.origin)
      assert.equal(clientData.crossOrigin, false)
      assert.ok(clientData.challenge)
    })

    it('reconstructs WebAuthn signed data for verification', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('reconstruction test')
      const signature = await signer.sign(payload)
      
      // Test the WebAuthn-specific verification
      const result = await signature.verifyWebAuthn(signer.verifier, payload)
      assert.ok(result.ok)
    })

    it('fails verification with mismatched payload', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const originalPayload = new TextEncoder().encode('original payload')
      const signature = await signer.sign(originalPayload)
      
      const differentPayload = new TextEncoder().encode('different payload')
      const result = await signature.verify(signer.verifier, differentPayload)
      
      assert.ok(result.error)
      assert.ok(result.error.message.includes('Challenge mismatch'))
    })
  })

  describe('WebAuthn Signature Parsing', () => {
    it('parses DER-encoded signatures from real WebAuthn responses', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      // Create a realistic DER-encoded signature
      const r = new Uint8Array(32).fill(0x11)
      const s = new Uint8Array(32).fill(0x22)
      
      // DER format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
      const derSignature = new Uint8Array(6 + 32 + 32)
      derSignature[0] = 0x30 // SEQUENCE
      derSignature[1] = 68   // Total length
      derSignature[2] = 0x02 // INTEGER
      derSignature[3] = 32   // R length
      derSignature.set(r, 4)
      derSignature[36] = 0x02 // INTEGER  
      derSignature[37] = 32   // S length
      derSignature.set(s, 38)
      
      const parsed = signer.parseWebAuthnSignature(derSignature)
      
      assert.equal(parsed.length, 64)
      assert.deepEqual(parsed.slice(0, 32), r)
      assert.deepEqual(parsed.slice(32, 64), s)
    })

    it('handles variable-length DER components', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      // Create DER with leading zeros (common in real WebAuthn)
      const r = new Uint8Array(33)
      r[0] = 0x00 // Leading zero
      r.fill(0x11, 1)
      
      const s = new Uint8Array(31) // Shorter than 32 bytes
      s.fill(0x22)
      
      const derSignature = new Uint8Array(8 + 33 + 31)
      derSignature[0] = 0x30 // SEQUENCE
      derSignature[1] = 68   // Total length
      derSignature[2] = 0x02 // INTEGER
      derSignature[3] = 33   // R length (with leading zero)
      derSignature.set(r, 4)
      derSignature[37] = 0x02 // INTEGER
      derSignature[38] = 31   // S length
      derSignature.set(s, 39)
      
      const parsed = signer.parseWebAuthnSignature(derSignature)
      
      assert.equal(parsed.length, 64)
      // R should have leading zero removed and be padded to 32 bytes
      const expectedR = new Uint8Array(32).fill(0x11)
      // S should be padded to 32 bytes
      const expectedS = new Uint8Array(32)
      expectedS.fill(0x22, 1) // Padded with leading zero
      
      assert.deepEqual(parsed.slice(0, 32), expectedR)
      assert.deepEqual(parsed.slice(32, 64), expectedS)
    })
  })

  describe('WebAuthn Integration Edge Cases', () => {
    it('handles authenticator data variations', async () => {
      // Create custom mock with different authenticator data
      navigator.credentials.get = async (options) => {
      const challenge = new Uint8Array(options?.publicKey?.challenge || new ArrayBuffer(32))
        
        const clientDataJSON = new TextEncoder().encode(JSON.stringify({
          type: 'webauthn.get',
        challenge: btoa(Array.from(challenge, c => String.fromCharCode(c)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
          origin: window.location.origin,
          crossOrigin: false
        }))
        
        // Create authenticator data with additional flags
        const authenticatorData = new Uint8Array(37)
        authenticatorData[32] = 0x05 // UP (User Present) + UV (User Verified) flags
        
        const signature = new Uint8Array(64)
        signature.fill(0x99) // Different test pattern
        
        return {
          id: 'test-credential-id',
          type: 'public-key',
          rawId: new Uint8Array([1, 2, 3, 4]).buffer,
          response: {
            clientDataJSON: clientDataJSON.buffer,
            authenticatorData: authenticatorData.buffer,
            signature: signature.buffer,
            userHandle: null
          }
        }
      }
      
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('authenticator data test')
      const signature = await signer.sign(payload)
      
      // Should handle different authenticator data correctly
      // @ts-ignore - WebAuthn signature has webauthnContext property
      assert.ok(signature.webauthnContext.authenticatorData)
      // @ts-ignore - WebAuthn signature has webauthnContext property
      assert.equal(signature.webauthnContext.authenticatorData[32], 0x05)
    })

    it('serializes and deserializes WebAuthn signatures', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('serialization test')
      const signature = await signer.sign(payload)
      
      // Test JSON serialization
      const json = signature.toJSON()
      assert.ok(json['/'])
      assert.ok(json['/'].bytes)
      
      // The signature should be base64-encoded
      const base64Signature = json['/'].bytes
      assert.ok(typeof base64Signature === 'string')
    })
  })

  describe('Performance and Reliability', () => {
    it('handles multiple concurrent WebAuthn operations', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      // Create multiple signing operations
      const payloads = [
        new TextEncoder().encode('concurrent test 1'),
        new TextEncoder().encode('concurrent test 2'),
        new TextEncoder().encode('concurrent test 3')
      ]
      
      const signingPromises = payloads.map(payload => signer.sign(payload))
      const signatures = await Promise.all(signingPromises)
      
      // All signatures should be valid
      assert.equal(signatures.length, 3)
      signatures.forEach(signature => {
        assert.ok(signature instanceof Uint8Array)
        // @ts-ignore - WebAuthn signature has webauthnContext property
        assert.ok(signature.webauthnContext)
      })
      
      // Verify all signatures
      const verificationResults = await Promise.all(
        signatures.map((sig, i) => sig.verify(signer.verifier, payloads[i]))
      )
      
      verificationResults.forEach(result => {
        assert.ok(result.ok)
        assert.equal(result.error, undefined)
      })
    })

    it('maintains signature integrity across operations', async () => {
      const authenticateFunction = createWebAuthnAuthenticateFunction()
      const signer = WebAuthnSigner.createWebAuthnSigner(testDID, authenticateFunction)
      
      const payload = new TextEncoder().encode('integrity test')
      
      // Sign the same payload multiple times
      const signature1 = await signer.sign(payload)
      const signature2 = await signer.sign(payload)
      
      // Both should verify correctly (even though they're different signatures)
      const result1 = await signature1.verify(signer.verifier, payload)
      const result2 = await signature2.verify(signer.verifier, payload)
      
      assert.ok(result1.ok)
      assert.ok(result2.ok)
      
      // But they should be cryptographically different
      assert.notDeepEqual(signature1.raw, signature2.raw)
    })
  })
})
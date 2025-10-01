#!/usr/bin/env node

/**
 * P-256 (ES256) Usage Examples for @ucanto/principal
 * 
 * This file demonstrates how to use P-256 ECDSA signatures with ucanto,
 * including key generation, signing, verification, and UCAN integration.
 */

import { P256 } from '../src/lib.js'
import * as Core from '../../core/src/lib.js'
import * as Client from '../../client/src/lib.js'

console.log('🎯 P-256 (ES256) Examples for @ucanto/principal')
console.log('=' .repeat(60))

// Example 1: Basic Key Generation and Information
async function basicKeyGeneration() {
  console.log('\n📘 Example 1: Basic Key Generation')
  console.log('-' .repeat(40))
  
  // Generate a new P-256 keypair
  const keypair = await P256.generate()
  
  console.log(`🔑 Generated P-256 keypair:`)
  console.log(`   DID: ${keypair.did()}`)
  console.log(`   Algorithm: ${keypair.signatureAlgorithm}`)
  console.log(`   Signature Code: 0x${keypair.signatureCode.toString(16)}`)
  console.log(`   Verifier Code: 0x${keypair.verifier.code.toString(16)}`)
  
  return keypair
}

// Example 2: Signing and Verification
async function signingAndVerification() {
  console.log('\n📘 Example 2: Signing and Verification')
  console.log('-' .repeat(40))
  
  const signer = await P256.generate()
  
  // Sign a message
  const message = 'Hello P-256 UCAN!'
  const payload = new TextEncoder().encode(message)
  const signature = await signer.sign(payload)
  
  console.log(`📝 Message: "${message}"`)
  console.log(`🔏 Signature: ${signature.raw.length} bytes (ES256)`)
  console.log(`📊 Signature algorithm: ${signature.algorithm}`)
  
  // Verify the signature
  const isValid = await signer.verify(payload, signature)
  console.log(`✅ Signature verification: ${isValid ? 'VALID' : 'INVALID'}`)
  
  // Verify with separate verifier
  const verifier = P256.Verifier.parse(signer.did())
  const crossVerification = await verifier.verify(payload, signature)
  console.log(`🔄 Cross-verification: ${crossVerification ? 'VALID' : 'INVALID'}`)
  
  // Test with wrong message (should fail)
  const wrongPayload = new TextEncoder().encode('Wrong message')
  const shouldFail = await signer.verify(wrongPayload, signature)
  console.log(`[X] Wrong message verification: ${shouldFail ? 'VALID' : 'INVALID (expected)'}`)
  
  return signer
}

// Example 3: Key Serialization and Loading
async function keySerialization() {
  console.log('\n📘 Example 3: Key Serialization and Loading')
  console.log('-' .repeat(40))
  
  // Generate and serialize a keypair
  const original = await P256.generate()
  const serialized = P256.format(original)
  
  console.log(`🔑 Original DID: ${original.did()}`)
  console.log(`💾 Serialized length: ${serialized.length} characters`)
  console.log(`📋 Serialized (preview): ${serialized.substring(0, 50)}...`)
  
  // Load the keypair back
  const restored = P256.parse(serialized)
  
  console.log(`🔄 Restored DID: ${restored.did()}`)
  console.log(`✅ Match: ${original.did() === restored.did() ? 'YES' : 'NO'}`)
  
  // Test that restored keypair works
  const testPayload = new TextEncoder().encode('serialization test')
  const originalSig = await original.sign(testPayload)
  const restoredVerification = await restored.verify(testPayload, originalSig)
  
  console.log(`🔐 Cross-keypair verification: ${restoredVerification ? 'VALID' : 'INVALID'}`)
  
  return { original, restored, serialized }
}

// Example 4: UCAN Delegation with P-256
async function ucanDelegation() {
  console.log('\n📘 Example 4: UCAN Delegation with P-256')
  console.log('-' .repeat(40))
  
  // Create service and user agents
  const service = await P256.generate()
  const user = await P256.generate()
  
  console.log(`🏢 Service DID: ${service.did()}`)
  console.log(`👤 User DID: ${user.did()}`)
  
  // Create a delegation from service to user
  const delegation = await Core.delegate({
    issuer: service,
    audience: user,
    capabilities: [
      {
        can: 'store/add',
        with: service.did(),
        nb: { space: 'user-space' }
      },
      {
        can: 'store/list',
        with: service.did(),
        nb: {}
      }
    ],
    expiration: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    facts: [
      { 'service': 'example-storage' },
      { 'plan': 'premium' }
    ]
  })
  
  console.log(`📜 Delegation created: ${delegation.cid}`)
  console.log(`⏰ Expires: ${new Date(delegation.expiration * 1000).toISOString()}`)
  console.log(`🎫 Capabilities: ${delegation.capabilities.length}`)
  console.log(`📊 Facts: ${delegation.facts.length}`)
  
  return { service, user, delegation }
}

// Example 5: Client Invocations with P-256
async function clientInvocations() {
  console.log('\n📘 Example 5: Client Invocations with P-256')
  console.log('-' .repeat(40))
  
  const serviceAgent = await P256.generate()
  const clientAgent = await P256.generate()
  
  // Create a delegation for the client
  const delegation = await Core.delegate({
    issuer: serviceAgent,
    audience: clientAgent,
    capabilities: [{
      can: 'file/upload',
      with: serviceAgent.did(),
      nb: { size: 1000000 } // 1MB limit
    }],
    expiration: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  })
  
  // Create an invocation using the delegation
  const invocation = Client.invoke({
    issuer: clientAgent,
    audience: serviceAgent,
    capability: {
      can: 'file/upload',
      with: serviceAgent.did(),
      nb: {
        file: 'document.pdf',
        size: 856432, // Under the 1MB limit
        hash: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy'
      }
    },
    proofs: [delegation]
  })
  
  console.log(`🏢 Service: ${serviceAgent.did()}`)
  console.log(`👤 Client: ${clientAgent.did()}`)
  console.log(`📤 Invocation capability: ${invocation.capabilities[0].can}`)
  console.log(`🎫 Proof delegation: ${delegation.cid}`)
  console.log(`📁 File: ${invocation.capabilities[0].nb.file}`)
  console.log(`📏 Size: ${(invocation.capabilities[0].nb.size / 1024 / 1024).toFixed(2)} MB`)
  
  return { serviceAgent, clientAgent, delegation, invocation }
}

// Example 6: Multi-level Delegation Chain
async function delegationChain() {
  console.log('\n📘 Example 6: Multi-level Delegation Chain')
  console.log('-' .repeat(40))
  
  // Create a three-level delegation chain: Service -> Organization -> User
  const serviceAgent = await P256.generate()
  const orgAgent = await P256.generate()
  const userAgent = await P256.generate()
  
  console.log(`🏢 Service: ${serviceAgent.did()}`)
  console.log(`🏛️ Organization: ${orgAgent.did()}`)
  console.log(`👤 User: ${userAgent.did()}`)
  
  // Level 1: Service delegates to Organization
  const serviceDelegation = await Core.delegate({
    issuer: serviceAgent,
    audience: orgAgent,
    capabilities: [{
      can: 'space/*',
      with: serviceAgent.did(),
      nb: {}
    }],
    expiration: Math.floor(Date.now() / 1000) + (365 * 24 * 3600), // 1 year
    facts: [{ role: 'organization-admin' }]
  })
  
  // Level 2: Organization delegates specific capabilities to User
  const orgDelegation = await Core.delegate({
    issuer: orgAgent,
    audience: userAgent,
    capabilities: [{
      can: 'space/blob/add',
      with: serviceAgent.did(),
      nb: { size: 10000000 } // 10MB limit
    }],
    proofs: [serviceDelegation], // Include the service delegation
    expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 3600), // 30 days
    facts: [{ role: 'user', department: 'engineering' }]
  })
  
  // User creates an invocation with the full delegation chain
  const invocation = Client.invoke({
    issuer: userAgent,
    audience: serviceAgent,
    capability: {
      can: 'space/blob/add',
      with: serviceAgent.did(),
      nb: {
        blob: 'bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e',
        size: 5242880 // 5MB
      }
    },
    proofs: [orgDelegation] // The org delegation contains the service delegation
  })
  
  console.log(`🔗 Service delegation: ${serviceDelegation.cid}`)
  console.log(`🔗 Org delegation: ${orgDelegation.cid}`)
  console.log(`📤 Final invocation capability: ${invocation.capabilities[0].can}`)
  console.log(`📊 Delegation chain depth: 2 levels`)
  
  return { serviceAgent, orgAgent, userAgent, serviceDelegation, orgDelegation, invocation }
}

// Example 7: P-256 vs Ed25519 Comparison
async function algorithmComparison() {
  console.log('\n📘 Example 7: P-256 vs Ed25519 Comparison')
  console.log('-' .repeat(40))
  
  // Import ed25519 for comparison
  const { ed25519 } = await import('../src/lib.js')
  
  const p256Signer = await P256.generate()
  const ed25519Signer = await ed25519.generate()
  
  const testMessage = 'Algorithm comparison test message'
  const payload = new TextEncoder().encode(testMessage)
  
  // Time P-256 operations
  const p256Start = performance.now()
  const p256Signature = await p256Signer.sign(payload)
  const p256SignTime = performance.now() - p256Start
  
  const p256VerifyStart = performance.now()
  await p256Signer.verify(payload, p256Signature)
  const p256VerifyTime = performance.now() - p256VerifyStart
  
  // Time Ed25519 operations
  const ed25519Start = performance.now()
  const ed25519Signature = await ed25519Signer.sign(payload)
  const ed25519SignTime = performance.now() - ed25519Start
  
  const ed25519VerifyStart = performance.now()
  await ed25519Signer.verify(payload, ed25519Signature)
  const ed25519VerifyTime = performance.now() - ed25519VerifyStart
  
  console.log('🔍 Algorithm Comparison:')
  console.log('')
  console.log('                 | P-256 (ES256) | Ed25519 (EdDSA)')
  console.log('-----------------|---------------|----------------')
  console.log(`Signature Size   | ${p256Signature.raw.length.toString().padStart(11)} bytes | ${ed25519Signature.raw.length.toString().padStart(12)} bytes`)
  console.log(`DID Length       | ${p256Signer.did().length.toString().padStart(11)} chars | ${ed25519Signer.did().length.toString().padStart(12)} chars`)
  console.log(`Sign Time        | ${p256SignTime.toFixed(2).padStart(9)} ms | ${ed25519SignTime.toFixed(2).padStart(10)} ms`)
  console.log(`Verify Time      | ${p256VerifyTime.toFixed(2).padStart(9)} ms | ${ed25519VerifyTime.toFixed(2).padStart(10)} ms`)
  console.log(`Algorithm Code   | ${'0x' + p256Signer.signatureCode.toString(16).padStart(9)} | ${'0x' + ed25519Signer.signatureCode.toString(16).padStart(10)}`)
  
  console.log('\n💡 Use Cases:')
  console.log('   P-256: NIST compliance, enterprise integration, HSM compatibility')
  console.log('   Ed25519: Performance, smaller signatures, modern applications')
}

// Run all examples
async function main() {
  try {
    await basicKeyGeneration()
    await signingAndVerification()
    await keySerialization()
    await ucanDelegation()
    await clientInvocations()
    await delegationChain()
    await algorithmComparison()
    
    console.log('\n🎉 All P-256 examples completed successfully!')
    console.log('\n📚 For more information:')
    console.log('   • UCAN Specification: https://github.com/ucan-wg/spec')
    console.log('   • ucanto Documentation: https://github.com/storacha/ucanto')
    console.log('   • P-256 Standard: https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-4.pdf')
    
  } catch (error) {
    console.error('❌ Example failed:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// Export for use in other files
export {
  basicKeyGeneration,
  signingAndVerification,
  keySerialization,
  ucanDelegation,
  clientInvocations,
  delegationChain,
  algorithmComparison
}
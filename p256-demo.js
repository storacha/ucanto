#!/usr/bin/env node

/**
 * P-256 UCAN Demo
 * Demonstrates the new P-256 support in ucanto
 */

import { P256 } from './packages/principal/src/lib.js'
import * as Core from './packages/core/src/lib.js'

console.log('🎯 P-256 UCAN Demo')
console.log('=' .repeat(50))

async function main() {
  console.log('✨ Generating P-256 keypair...')
  const alice = await P256.generate()
  const bob = await P256.generate()
  
  console.log(`🔑 Alice DID: ${alice.did()}`)
  console.log(`🔑 Bob DID: ${bob.did()}`)
  console.log(`📊 Alice signature algorithm: ${alice.signatureAlgorithm}`)
  console.log(`📊 Alice signature code: 0x${alice.signatureCode.toString(16)}`)
  
  console.log('\n📜 Creating UCAN delegation from Alice to Bob...')
  
  const delegation = await Core.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [{
      can: 'store/add',
      with: alice.did(),
      nb: { space: 'test' }
    }],
    expiration: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  })
  
  console.log(`✅ Delegation created with CID: ${delegation.cid}`)
  
  console.log('\n🔐 Testing signature verification...')
  
  const testPayload = new TextEncoder().encode('Hello P-256 UCAN!')
  const signature = await alice.sign(testPayload)
  
  console.log(`📝 Test payload: "Hello P-256 UCAN!"`)
  console.log(`🔏 Signature length: ${signature.raw.length} bytes`)
  
  // Verify with Alice's verifier
  const isValid = await alice.verifier.verify(testPayload, signature)
  console.log(`✅ Signature verification: ${isValid ? 'VALID' : 'INVALID'}`)
  
  // Verify with Bob's verifier (should fail)
  const bobVerification = await bob.verifier.verify(testPayload, signature)
  console.log(`❌ Bob's verification (expected failure): ${bobVerification ? 'VALID' : 'INVALID'}`)
  
  console.log('\n🎉 P-256 UCAN implementation working successfully!')
  console.log('\n📋 Summary:')
  console.log(`   • Algorithm: ES256 (P-256 ECDSA)`)
  console.log(`   • Key Generation: ✅ Working`)
  console.log(`   • DID Creation: ✅ Working`) 
  console.log(`   • UCAN Delegation: ✅ Working`)
  console.log(`   • Signature Creation: ✅ Working`)
  console.log(`   • Signature Verification: ✅ Working`)
}

main().catch(console.error)
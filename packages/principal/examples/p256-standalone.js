/**
 * P-256 Standalone Usage Examples
 * This example demonstrates P-256 key operations without external dependencies
 */

import * as P256 from '../src/p256.js'

async function main() {
  console.log('🔑 P-256 Standalone Examples\n')

  // 1. Generate P-256 keypairs
  console.log('1. Generating P-256 keypairs...')
  const alice = await P256.generate()
  const bob = await P256.generate()
  console.log(`✓ Alice DID: ${alice.did()}`)
  console.log(`✓ Bob DID: ${bob.did()}`)

  // 2. Basic signing and verification
  console.log('\n2. Basic signing and verification...')
  const message = new TextEncoder().encode('Hello P-256 World!')
  
  const signature = await alice.sign(message)
  console.log(`✓ Signature created with code: ${signature.code}`)
  
  const isValidByAlice = await alice.verify(message, signature)
  const isValidByBob = await bob.verify(message, signature)
  console.log(`✓ Verification by Alice: ${isValidByAlice}`)
  console.log(`✓ Verification by Bob: ${isValidByBob}`)

  // 3. Key serialization and deserialization
  console.log('\n3. Key serialization and deserialization...')
  const aliceArchive = alice.toArchive()
  const aliceRestored = P256.from(aliceArchive)
  console.log(`✓ Alice restored DID: ${aliceRestored.did()}`)
  console.log(`✓ DIDs match: ${alice.did() === aliceRestored.did()}`)

  // 4. Multiple signature verification
  console.log('\n4. Multiple signature verification...')
  const message1 = new TextEncoder().encode('Message 1')
  const message2 = new TextEncoder().encode('Message 2')
  
  const sig1 = await alice.sign(message1)
  const sig2 = await alice.sign(message2)
  
  console.log(`✓ Signature 1 valid: ${await alice.verify(message1, sig1)}`)
  console.log(`✓ Signature 2 valid: ${await alice.verify(message2, sig2)}`)
  console.log(`✓ Cross-verification fails: ${await alice.verify(message1, sig2)}`)

  console.log('\n🎉 All P-256 operations completed successfully!')
}

// Run the example
main().catch(console.error)
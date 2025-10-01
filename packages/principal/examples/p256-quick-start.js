/**
 * P-256 Quick Start Examples
 * 
 * Essential P-256 usage patterns for @ucanto/principal
 */

import { P256 } from '@ucanto/principal'
import * as Client from '@ucanto/client'
import * as Core from '@ucanto/core'

// Basic P-256 key generation and usage
export async function quickStart() {
  // 1. Generate P-256 keypair
  const keypair = await P256.generate()
  console.log(`DID: ${keypair.did()}`) // did:key:zDnae...
  
  // 2. Sign a message
  const message = new TextEncoder().encode('Hello P-256!')
  const signature = await keypair.sign(message)
  
  // 3. Verify signature
  const isValid = await keypair.verify(message, signature)
  console.log(`Valid: ${isValid}`) // true
  
  // 4. Serialize and restore keypair
  const serialized = P256.format(keypair)
  const restored = P256.parse(serialized)
  console.log(`Restored: ${keypair.did() === restored.did()}`) // true
  
  return keypair
}

// P-256 UCAN delegation
export async function delegation() {
  const issuer = await P256.generate()
  const audience = await P256.generate()
  
  // Create delegation with P-256 signatures
  const delegation = await Core.delegate({
    issuer,
    audience,
    capabilities: [{ 
      can: 'store/add', 
      with: issuer.did(),
      nb: { space: 'my-space' }
    }],
    expiration: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  })
  
  console.log(`Delegation: ${delegation.cid}`)
  return { issuer, audience, delegation }
}

// P-256 client invocations
export async function clientInvocation() {
  const service = await P256.generate()
  const client = await P256.generate()
  
  // Service delegates capability to client
  const delegation = await Core.delegate({
    issuer: service,
    audience: client, 
    capabilities: [{ can: 'file/read', with: service.did(), nb: {} }]
  })
  
  // Client invokes capability
  const invocation = Client.invoke({
    issuer: client,
    audience: service,
    capability: {
      can: 'file/read',
      with: service.did(),
      nb: { path: '/documents/report.pdf' }
    },
    proofs: [delegation]
  })
  
  console.log(`Invocation: ${invocation.capabilities[0].can}`)
  return { service, client, delegation, invocation }
}
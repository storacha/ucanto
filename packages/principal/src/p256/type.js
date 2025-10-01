/**
 * P-256 type definitions - JavaScript version
 * For TypeScript types, see the package exports
 */

export * from '@ucanto/interface'

// Re-export common types for convenience
import * as Signature from '@ipld/dag-ucan/signature'

/**
 * ES256 signature algorithm identifier
 * @type {number}
 */
export const ES256_SIG_ALG = Signature.ES256

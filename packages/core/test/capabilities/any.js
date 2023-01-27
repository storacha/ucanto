import { capability, Schema } from '../../src/lib.js'

/**
 * Represents the top `{ can: '*', with: 'did:key:zAlice' }` capability, which we often
 * also call account linking.
 */
export const _ = capability({
  can: '*',
  with: Schema.DID,
})

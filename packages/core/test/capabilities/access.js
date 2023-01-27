import { _ } from './any.js'
import { capability, Schema } from '../../src/lib.js'
import { equalWith } from './util.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `access/` prefixed capability for the agent identified
 * by did:key in the `with` field.
 */
export const access = _.derive({
  to: capability({
    can: 'access/*',
    with: Schema.DID.match({ method: 'web' }),
  }),
  derives: equalWith,
})

/**
 * Issued by trusted authority (usually the one handling invocation that contains this proof) 
 * to the account (aud) to update invocation local state of the document.
 *
 * @see https://github.com/web3-storage/specs/blob/main/w3-account.md#update
 * 
 * @example
 * ```js
 * {
    iss: "did:web:web3.storage",
    aud: "did:mailto:alice@web.mail",
    att: [{
      with: "did:web:web3.storage",
      can: "./update",
      nb: { key: "did:key:zAgent" }
    }],
    exp: null
    sig: "..."
  }
 * ```
 */
export const session = capability({
  can: './update',
  // Should be web3.storage DID
  with: Schema.DID.match({ method: 'web' }),
  nb: {
    // Agent DID so it can sign UCANs as did:mailto if it matches this delegation `aud`
    key: Schema.DID.match({ method: 'key' }),
  },
})

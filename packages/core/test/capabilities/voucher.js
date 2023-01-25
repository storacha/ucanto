import { equalWith, canDelegateURI, canDelegateLink, fail } from './util.js'
import { capability, Schema } from '../../src/lib.js'
const { URI, Text, Link, DID } = Schema
export * from './voucher/types.js'

export const Voucher = capability({
  can: 'voucher/*',
  with: DID.match({ method: 'key' }),
})

export const Claim = Voucher.derive({
  to: capability({
    can: 'voucher/claim',
    with: DID.match({ method: 'key' }),
    nb: {
      product: Link,
      identity: URI.match({ protocol: 'mailto:' }),
      service: DID,
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
        fail(canDelegateLink(child.nb.product, parent.nb.product)) ||
        fail(canDelegateURI(child.nb.service, parent.nb.service)) ||
        true
      )
    },
  }),
  derives: equalWith,
})

export const Redeem = capability({
  can: 'voucher/redeem',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    product: Text,
    identity: Text,
    account: URI.match({ protocol: 'did:' }),
  },
})

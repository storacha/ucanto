import { equalWith, canDelegateURI, fail } from './util.js'
import { capability, URI, Text, Link, DID } from '../src/lib.js'

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
        fail(
          canDelegateURI(
            child.nb.product.toString(),
            parent.nb.product.toString()
          )
        ) ||
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

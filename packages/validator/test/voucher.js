import { equalWith, canDelegateURI, canDelegateLink, and } from './util.js'
import { capability, URI, Text, Link, DID, Schema, ok } from '../src/lib.js'

export const Voucher = capability({
  can: 'voucher/*',
  with: DID.match({ method: 'key' }),
})

export const Claim = Voucher.derive({
  to: capability({
    can: 'voucher/claim',
    with: DID.match({ method: 'key' }),
    nb: Schema.struct({
      product: Link,
      identity: URI.match({ protocol: 'mailto:' }),
      service: DID,
    }),
    derives: (child, parent) => {
      return (
        and(equalWith(child, parent)) ||
        and(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
        and(canDelegateLink(child.nb.product, parent.nb.product)) ||
        and(canDelegateURI(child.nb.service, parent.nb.service)) ||
        ok({})
      )
    },
  }),
  derives: equalWith,
})

export const Redeem = capability({
  can: 'voucher/redeem',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    product: Text,
    identity: Text,
    account: URI.match({ protocol: 'did:' }),
  }),
})

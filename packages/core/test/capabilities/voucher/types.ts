import type {
  Capability,
  DID,
  Link,
  ServiceMethod,
  Failure,
} from '@ucanto/interface'

export * from '@ucanto/interface'

type AccountDID = DID<'key'>
type AgentDID = DID<'key'>

// Voucher Protocol
export interface VoucherClaim
  extends Capability<
    'voucher/claim',
    AccountDID | AgentDID,
    {
      /**
       * Product CID
       */
      product: Link<unknown, number, number, 0 | 1>

      /**
       * URI for an identity to be validated
       */
      identity: `mailto:${string}`

      /**
       * DID of the service they wish to redeem voucher with
       */
      service: DID
    }
  > {}

export interface VoucherRedeem
  extends Capability<
    'voucher/redeem',
    `did:${string}`,
    {
      product: string
      identity: string
      account: `did:${string}`
    }
  > {
  nb: {
    product: string
    identity: string
    account: `did:${string}`
  }
}

export interface Service {
  voucher: {
    claim: ServiceMethod<VoucherClaim, { service: DID }, Failure>
    redeem: ServiceMethod<VoucherRedeem, { product: string }, Failure>
  }
}

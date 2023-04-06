import * as API from '@ucanto/interface'
import * as Schema from '@ucanto/core/src/schema.js/index.js'

const invocationLink =
  /** @type {Schema.Schema<API.UCANLink<[API.Capability]>>} */ (Schema.link())

export const Inbound = Schema.variant({
  // Currently primary way to send a batch of invocations is to send a workflow
  // containing a list of (invocation) delegations.
  'ucanto/workflow@0.1.0': Schema.struct({
    run: invocationLink.array(),
  }),
  // ucanto client older than 0.6.0 will send a CAR with roots that are just
  // delegations. Since they are not self-describing we use fallback schema.
  _: /** @type {Schema.Schema<API.UCAN.UCAN<[API.Capability]>>} */ (
    Schema.unknown()
  ),
})

export const Outbound = Schema.variant({
  'ucanto/report@0.1.0': Schema.struct({
    receipts: Schema.dictionary({
      key: Schema.string(),
      value: /** @type {API.Reader<API.Link<API.ReceiptModel>>} */ (
        Schema.link({ version: 1 })
      ),
    }),
  }),
})

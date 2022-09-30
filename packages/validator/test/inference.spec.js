import * as Voucher from './voucher.js'
import { test, assert } from './test.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { capability, URI, Link } from '../src/lib.js'
import * as API from './types.js'

test('execute capabilty', () =>
  /**
   * @param {API.ConnectionView<API.Service>} connection
   */
  async connection => {
    const claim = Voucher.Claim.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {
        identity: URI.from(`mailto:${alice.did}@web.mail`),
        product: Link.parse('bafkqaaa'),
        service: w3.did(),
      },
    })

    const proof = Voucher.Redeem.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {
        product: 'test',
        identity: 'whatever',
        account: alice.did(),
      },
    })

    const redeem = Voucher.Redeem.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {
        product: 'test',
        identity: proof.capabilities[0].nb.identity,
        account: alice.did(),
      },
    })

    const r1 = await redeem.execute(connection)
    if (!r1.error) {
      r1.product.toLowerCase()
    }

    const r2 = await claim.execute(connection)
    if (!r2.error) {
      r2.service.toUpperCase()
    }
  })

test('can access fields on the proof', () =>
  /**
   * @param {API.Delegation<[API.VoucherRedeem]>} proof
   */
  proof => {
    const redeem = Voucher.Redeem.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: {
        product: proof.capabilities[0].nb.product,
        identity: proof.capabilities[0].nb.identity,
        account: proof.capabilities[0].nb.account,
      },
      proofs: [proof],
    })
  })

test('use InferInvokedCapability', () =>
  /**
   * @param {API.ConnectionView<API.Service>} connection
   * @param {API.InferInvokedCapability<typeof Voucher.Redeem>} capability
   */
  async (connection, capability) => {
    const redeem = Voucher.Redeem.invoke({
      issuer: alice,
      audience: w3,
      with: capability.with,
      nb: {
        product: capability.nb.product,
        identity: capability.nb.identity,
        account: capability.nb.account,
      },
    })

    const result = await redeem.execute(connection)
    if (!result.error) {
      result.product.toLocaleLowerCase()
    }
  })

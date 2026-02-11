import { test, assert } from './test.js'
import * as Client from '../src/lib.js'
import * as HTTP from '@ucanto/transport/http'
import { CAR } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import { DID, Message, Receipt } from '@ucanto/core'

test('README connection and invocation example works', async () => {
  const serviceSigner = ed25519.parse(
    'MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8='
  )
  const service = DID.parse(serviceSigner.did())
  const issuer = ed25519.parse(
    'MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM='
  )

  const channel = HTTP.open({
    url: new URL('about:blank'),
    fetch: async (url, init) => {
      assert.equal(url, 'about:blank')
      const request = await CAR.request.decode({
        headers: /** @type {Record<string, string>} */ (init.headers),
        body: /** @type {Uint8Array} */ (init.body),
      })
      const [invocation] = request.invocations

      const receipt = await Receipt.issue({
        issuer: serviceSigner,
        ran: invocation.link(),
        result: { ok: { accepted: true } },
      })
      const response = await CAR.response.encode(
        await Message.build({ receipts: [receipt] })
      )

      return {
        ok: true,
        arrayBuffer: () => response.body.buffer,
        headers: new Map([['content-type', CAR.contentType]]),
      }
    },
  })

  const connection = Client.connect({
    id: service,
    channel,
    codec: CAR.outbound,
  })

  const invocation = Client.invoke({
    issuer,
    audience: service,
    capability: {
      can: 'store/add',
      with: issuer.did(),
      nb: {
        link: 'bafybeigwflfnv7tjgpuy52ep45cbbgkkb2makd3bwhbj3ueabvt3eq43ca',
      },
    },
  })

  const [receipt] = await connection.execute(invocation)
  assert.ok(!receipt.out.error, `Expected no error, got: ${receipt.out.error}`)
  assert.deepEqual(receipt.out.ok, { accepted: true })
})

test('README AGENT_PRIVATE_KEY generation snippet works', async () => {
  const keypair = await ed25519.generate({ extractable: true })
  const privateKey = ed25519.format(keypair)
  const parsed = ed25519.parse(privateKey)

  assert.equal(parsed.did(), keypair.did())
})

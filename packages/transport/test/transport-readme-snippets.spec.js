import { test, assert } from './test.js'
import * as HTTP from '../src/http.js'
import { CAR, Codec } from '../src/lib.js'
import { ed25519 } from '@ucanto/principal'
import { invoke, Message, DID, Receipt } from '@ucanto/core'

test('README HTTP transport example works', async () => {
  const serviceSigner = ed25519.parse(
    'MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8='
  )
  const service = DID.parse(serviceSigner.did())
  const issuer = ed25519.parse(
    'MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM='
  )

  const invocation = invoke({
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

  const message = await Message.build({ invocations: [invocation] })
  const request = await CAR.request.encode(message)

  const channel = HTTP.open({
    url: new URL('about:blank'),
    fetch: async (url, init) => {
      assert.equal(url, 'about:blank')
      const decoded = await CAR.request.decode({
        headers: /** @type {Record<string, string>} */ (init.headers),
        body: /** @type {Uint8Array} */ (init.body),
      })
      const [received] = decoded.invocations

      const receipt = await Receipt.issue({
        issuer: serviceSigner,
        ran: received.link(),
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

  const response = await channel.request(request)
  const replyMessage = await CAR.response.decode(response)
  assert.equal(replyMessage.receipts.size, 1)
})

test('README pluggable codec example works', async () => {
  const outbound = Codec.outbound({
    encoders: { 'application/vnd.ipld.car': CAR.request },
    decoders: { 'application/vnd.ipld.car': CAR.response },
  })

  const inbound = Codec.inbound({
    decoders: { 'application/vnd.ipld.car': CAR.request },
    encoders: { 'application/vnd.ipld.car': CAR.response },
  })

  assert.ok(outbound)
  assert.ok(inbound)
})

test('README AGENT_PRIVATE_KEY generation snippet works', async () => {
  const keypair = await ed25519.generate({ extractable: true })
  const privateKey = ed25519.format(keypair)
  const parsed = ed25519.parse(privateKey)

  assert.equal(parsed.did(), keypair.did())
})

import * as Client from '@ucanto/client'
import * as Server from '../src/server.js'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as API from '@ucanto/interface'
import { alice, bob, mallory, service as w3 } from './fixtures.js'
import { test, assert } from './test.js'
import * as Access from './service/access.js'
import { Verifier } from '@ucanto/principal/ed25519'
import { UnavailableProof } from '@ucanto/validator'

const context = {
  id: w3,
  my: () => [],
  /**
   * @param {API.Capability} capability
   * @param {API.DID} issuer
   * @returns
   */
  canIssue: (capability, issuer) =>
    capability.with === issuer || issuer == w3.did(),
  principal: Verifier,
  /**
   * @param {API.UCANLink} link
   */
  resolve: link => new UnavailableProof(link),
}

test('invocation', async () => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [
      {
        can: 'identity/link',
        with: 'mailto:alice@web.mail',
      },
    ],
  })
  const result = await Access.link(invocation, context)

  assert.containSubset(result, {
    error: true,
    name: 'Unauthorized',
    message: `Claim {"can":"identity/link"} is not authorized
  - Capability {"can":"identity/link","with":"mailto:alice@web.mail"} is not authorized because:
    - Capability can not be (self) issued by '${alice.did()}'
    - Delegated capability not found`,
  })
})

test('delegated invocation fail', async () => {
  const proof = await Client.delegate({
    issuer: w3,
    audience: alice,
    capabilities: [
      {
        can: 'identity/link',
        with: 'mailto:alice@web.mail',
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: proof.capabilities,
    proofs: [proof],
  })

  const result = await Access.link(invocation, context)
  assert.deepNestedInclude(result, {
    error: true,
    name: 'UnknownIDError',
    id: 'mailto:alice@web.mail',
  })
})

test('delegated invocation fail', async () => {
  const proof = await Client.delegate({
    issuer: w3,
    audience: alice,
    capabilities: [
      {
        can: 'identity/register',
        with: 'mailto:alice@web.mail',
      },
    ],
  })

  const invocation = await Client.delegate({
    issuer: alice,
    audience: bob,
    capabilities: proof.capabilities,
    proofs: [proof],
  })

  const result = await Access.register(invocation, context)
  assert.deepEqual(result, null)
})

test('checks service id', async () => {
  const server = Server.create({
    id: w3,
    service: { identity: Access },
    decoder: CAR,
    encoder: CBOR,
  })

  const client = Client.connect({
    id: w3,
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })

  const proof = await Client.delegate({
    issuer: w3,
    audience: bob,
    capabilities: [
      {
        can: 'identity/register',
        with: 'mailto:bob@web.mail',
      },
    ],
  })

  {
    const invocation = Client.invoke({
      issuer: bob,
      audience: mallory,
      capability: proof.capabilities[0],
      proofs: [proof],
    })

    const result = await invocation.execute(client)

    assert.deepNestedInclude(result, {
      error: true,
      name: 'InvalidAudience',
      audience: w3.did(),
      delegation: { audience: mallory.did() },
    })
  }

  {
    const invocation = Client.invoke({
      issuer: bob,
      audience: w3,
      capability: proof.capabilities[0],
      proofs: [proof],
    })

    const result = await invocation.execute(client)

    assert.equal(result?.error, true)

    assert.ok(
      result?.message.includes(`can not be (self) issued by '${w3.did()}'`)
    )
  }
})

test('checks for single capability invocation', async () => {
  const server = Server.create({
    id: w3,
    service: { identity: Access },
    decoder: CAR,
    encoder: CBOR,
  })

  const client = Client.connect({
    id: w3,
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })

  const proof = await Client.delegate({
    issuer: w3,
    audience: bob,
    capabilities: [
      {
        can: 'identity/register',
        with: 'mailto:bob@web.mail',
      },
    ],
  })

  const invocation = Client.invoke({
    issuer: bob,
    audience: w3,
    capability: proof.capabilities[0],
    proofs: [proof],
  })
  invocation.capabilities.push({
    can: 'identity/register',
    with: 'mailto:bob@web.mail',
  })

  const result = await invocation.execute(client)

  assert.deepNestedInclude(result, {
    error: true,
    name: 'InvocationCapabilityError',
    message: 'Invocation is required to have a single capability.',
    capabilities: [
      { can: 'identity/register', with: 'mailto:bob@web.mail' },
      { can: 'identity/register', with: 'mailto:bob@web.mail' },
    ],
  })
})

test('test access/claim provider', async () => {
  const server = Server.create({
    id: w3,
    service: { access: Access },
    decoder: CAR,
    encoder: CBOR,
  })

  /**
   * @type {Client.ConnectionView<{
   *  access: {
   *    claim: API.ServiceMethod<API.InferInvokedCapability<typeof Access.claimCapability>, never[], never>
   *  }
   * }>}
   */
  const client = Client.connect({
    id: w3,
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })

  const claim = Access.claimCapability.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
  })

  const result = await claim.execute(client)
  assert.deepEqual(result, [])
})

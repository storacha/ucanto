import * as Client from '@ucanto/client'
import * as Server from '../src/server.js'
import * as Provider from '../src/handler.js'
import * as CAR from '@ucanto/transport/car'
import * as API from '@ucanto/interface'
import { alice, bob, mallory, service } from './fixtures.js'
import { test, assert } from './test.js'
import * as Access from './service/access.js'
import { Verifier } from '@ucanto/principal/ed25519'
import { Schema, UnavailableProof } from '@ucanto/validator'
import { Absentee } from '@ucanto/principal'

const w3 = service.withDID('did:web:web3.storage')

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
  resolve: link => ({
    error: new UnavailableProof(link),
  }),
}

test('invocation', async () => {
  const invocation = await Client.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'identity/link',
        with: 'mailto:alice@web.mail',
      },
    ],
  })
  const result = await Access.link(invocation, context)

  assert.containSubset(result, {
    error: {
      name: 'Unauthorized',
      message: `Claim {"can":"identity/link"} is not authorized
  - Capability {"can":"identity/link","with":"mailto:alice@web.mail"} is not authorized because:
    - Capability can not be (self) issued by '${alice.did()}'
    - Delegated capability not found`,
    },
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
    audience: w3,
    capabilities: proof.capabilities,
    proofs: [proof],
  })

  const result = await Access.link(invocation, context)
  assert.containSubset(result, {
    error: {
      name: 'UnknownIDError',
      id: 'mailto:alice@web.mail',
    },
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
    audience: w3,
    capabilities: proof.capabilities,
    proofs: [proof],
  })

  const result = await Access.register(invocation, context)
  assert.deepEqual(result, { ok: {} })
})

test('checks service id', async () => {
  const server = Server.create({
    id: w3,
    service: { identity: Access },
    codec: CAR.inbound,
  })

  const client = Client.connect({
    id: w3,
    codec: CAR.outbound,
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

    const receipt = await invocation.execute(client)

    assert.containSubset(receipt, {
      out: {
        error: {
          name: 'InvalidAudience',
        },
      },
    })
    assert.equal(
      receipt.out.error?.message.includes(w3.did()),
      true,
      'mentions expected audience'
    )
    assert.equal(
      receipt.out.error?.message.includes(mallory.did()),
      true,
      'mentions actual audience'
    )
  }

  {
    const invocation = Client.invoke({
      issuer: bob,
      audience: w3,
      capability: proof.capabilities[0],
      proofs: [proof],
    })

    const receipt = await invocation.execute(client)

    assert.equal(receipt.out.error != null, true)

    assert.ok(
      receipt.out.error?.message.includes(
        `can not be (self) issued by '${w3.did()}'`
      )
    )
  }
})

test('checks for single capability invocation', async () => {
  const server = Server.create({
    id: w3,
    service: { identity: Access },
    codec: CAR.inbound,
  })

  const client = Client.connect({
    id: w3,
    codec: CAR.outbound,
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

  const receipt = await invocation.execute(client)

  assert.containSubset(receipt, {
    out: {
      error: {
        name: 'InvocationCapabilityError',
        message: 'Invocation is required to have a single capability.',
        capabilities: [
          { can: 'identity/register', with: 'mailto:bob@web.mail' },
          { can: 'identity/register', with: 'mailto:bob@web.mail' },
        ],
      },
    },
  })
})

test('test access/claim provider', async () => {
  const server = Server.create({
    id: w3,
    service: { access: Access },
    codec: CAR.inbound,
  })

  /**
   * @type {Client.ConnectionView<{
   *  access: {
   *    claim: API.ServiceMethod<API.InferInvokedCapability<typeof Access.claimCapability>, never[], API.Failure>
   *  }
   * }>}
   */
  const client = Client.connect({
    id: w3,
    codec: CAR.outbound,
    channel: server,
  })

  const claim = Access.claimCapability.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
  })

  const receipt = await claim.execute(client)
  assert.deepEqual(receipt.out, { ok: [] })
})

test('handle did:mailto audiences', async () => {
  const AccessRequest = Server.capability({
    can: 'access/request',
    with: Schema.did(),
    nb: Schema.struct({
      need: Schema.dictionary({
        key: Schema.string(),
        value: Schema.unknown().array(),
      }),
    }),
  })

  const handler = Provider.provideAdvanced({
    audience: Schema.did({ method: 'mailto' }),
    capability: AccessRequest,
    handler: async input => {
      return {
        ok: {
          allow: input.capability.nb.need,
        },
      }
    },
  })

  const request = await Client.delegate({
    issuer: alice,
    audience: Absentee.from({ id: 'did:mailto:web.mail:alice' }),
    capabilities: [
      {
        can: 'access/request',
        with: alice.did(),
        nb: {
          need: {
            'store/*': [],
          },
        },
      },
    ],
  })

  const result = await handler(request, {
    id: w3,
    principal: Verifier,
  })

  assert.equal(result.error, undefined)

  const badRequest = await Client.delegate({
    issuer: alice,
    audience: w3,
    capabilities: [
      {
        can: 'access/request',
        with: alice.did(),
        nb: {
          need: {
            'store/*': [],
          },
        },
      },
    ],
  })

  const badAudience = await handler(badRequest, {
    id: w3,
    principal: Verifier,
  })

  assert.containSubset(badAudience, {
    error: {
      name: 'InvalidAudience',
    },
  })
  assert.match(
    `${badAudience.error}`,
    /InvalidAudience.*Expected .*did:mailto:.*got.*did:web:/
  )
})

test('union result', () => {
  const add = Server.capability({
    can: 'store/add',

    with: Server.URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      key: Schema.string(),
    }),
  })

  /**
   * @type {API.ServiceMethod<API.InferInvokedCapability<typeof add>, ({status: 'done'}|{status:'pending', progress: number}), API.Failure>}
   */
  const provider = Provider.provide(add, async ({ capability }) => {
    if (capability.nb.key === 'done') {
      return {
        ok: {
          status: 'done',
        },
      }
    } else {
      return {
        ok: {
          status: 'pending',
          progress: 5,
        },
      }
    }
  })
})

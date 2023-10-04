import * as Client from '@ucanto/client'
import * as Server from '../src/server.js'
import * as Provider from '../src/handler.js'
import * as CAR from '@ucanto/transport/car'
import * as API from '@ucanto/interface'
import { alice, bob, mallory, service } from './fixtures.js'
import { test, assert } from './test.js'
import * as Access from './service/access.js'
import { Verifier } from '@ucanto/principal/ed25519'
import { Schema, UnavailableProof, Unauthorized } from '@ucanto/validator'
import { Absentee } from '@ucanto/principal'
import { capability } from '../src/server.js'
import { isLink, parseLink, fail } from '../src/lib.js'

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
  validateAuthorization: () => ({ ok: {} }),
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
    validateAuthorization: () => ({ ok: {} }),
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
    validateAuthorization: () => ({ ok: {} }),
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
    validateAuthorization: () => ({ ok: {} }),
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
    validateAuthorization: () => ({ ok: {} }),
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
    validateAuthorization: () => ({ ok: {} }),
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

const Offer = capability({
  can: 'aggregate/offer',
  with: Schema.did(),
  nb: Schema.struct({
    commP: Schema.string(),
  }),
})

const Arrange = capability({
  can: 'offer/arrange',
  with: Schema.did(),
  nb: Schema.struct({
    commP: Schema.string(),
  }),
})

test('fx.join', async () => {
  let cid = undefined
  const offer = Provider.provideAdvanced({
    capability: Offer,
    handler: async ({ capability, context }) => {
      const fx = await Arrange.invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: { commP: capability.nb.commP },
      }).delegate()

      cid = fx.root.cid

      return Provider.ok({ status: 'pending' }).join(fx.link())
    },
  })

  const { provider, consumer } = setup({ aggregate: { offer } })
  const receipt = await Offer.invoke({
    issuer: alice,
    audience: provider.id,
    with: alice.did(),
    nb: {
      commP: 'hello',
    },
  }).execute(consumer)

  assert.deepEqual(receipt.out, { ok: { status: 'pending' } })

  assert.ok(isLink(receipt.fx.join), 'join is effect is set')
  assert.deepEqual(receipt.fx.join, cid)
})

test('fx.fork', async () => {
  /** @type {API.Link[]} */
  let forks = []
  const offer = Provider.provideAdvanced({
    capability: Offer,
    handler: async ({ capability, context }) => {
      const fx = await Arrange.invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: { commP: capability.nb.commP },
      }).delegate()

      forks.push(fx.root.cid)

      return Provider.ok({ status: 'pending' }).fork(fx.link())
    },
  })

  const { provider, consumer } = setup({ aggregate: { offer } })
  const receipt = await Offer.invoke({
    issuer: alice,
    audience: provider.id,
    with: alice.did(),
    nb: {
      commP: 'hello',
    },
  }).execute(consumer)

  assert.deepEqual(receipt.out, { ok: { status: 'pending' } })

  assert.deepEqual(receipt.fx.fork, forks)
})

test('fx.ok API', () => {
  const ok = Provider.ok({ x: 1 })
  assert.deepEqual(ok.result, { ok: { x: 1 } })
  assert.deepEqual(ok.effects, { fork: [] })
  assert.deepEqual(
    JSON.stringify(ok),
    JSON.stringify({
      ok: { x: 1 },
    })
  )

  /** @type {API.Run} */
  const run = parseLink('bafkqaaa')
  const join = ok.join(run)
  assert.equal(
    // @ts-expect-error - has no method
    join.join,
    undefined
  )
  assert.deepEqual(ok.result, { ok: { x: 1 } }, 'does not mutate')

  assert.deepEqual(
    join.do,
    {
      out: { ok: { x: 1 } },
      fx: { fork: [], join: run },
    },
    'includes join'
  )
  assert.deepEqual(join.result, { ok: { x: 1 } })
  assert.deepEqual(join.effects, { fork: [], join: run })
  assert.deepEqual(
    JSON.stringify(join),
    JSON.stringify({
      do: {
        out: { ok: { x: 1 } },
        fx: { fork: [], join: { '/': run.toString() } },
      },
    })
  )

  const fork = ok.fork(run)
  assert.deepEqual(ok.result, { ok: { x: 1 } }, 'does not mutate')

  assert.deepEqual(
    fork.do,
    {
      out: { ok: { x: 1 } },
      fx: { fork: [run] },
    },
    'includes fork'
  )
  assert.deepEqual(
    JSON.stringify(fork),
    JSON.stringify({
      do: {
        out: { ok: { x: 1 } },
        fx: { fork: [{ '/': run.toString() }] },
      },
    })
  )

  const joinfork = join.fork(run)
  assert.equal(
    // @ts-expect-error - has no join
    joinfork.join,
    undefined
  )

  assert.deepEqual(
    join.do,
    { out: { ok: { x: 1 } }, fx: { fork: [], join: run } },
    'does not mutate'
  )

  assert.deepEqual(
    joinfork.do,
    {
      out: { ok: { x: 1 } },
      fx: { fork: [run], join: run },
    },
    'includes fork'
  )
  assert.deepEqual(
    JSON.stringify(joinfork),
    JSON.stringify({
      do: {
        out: { ok: { x: 1 } },
        fx: { fork: [{ '/': run.toString() }], join: { '/': run.toString() } },
      },
    })
  )

  const forkjoin = ok.fork(run).join(run)
  assert.equal(
    // @ts-expect-error - has no join
    forkjoin.join,
    undefined
  )

  assert.deepEqual(
    forkjoin.do,
    {
      out: { ok: { x: 1 } },
      fx: { fork: [run], join: run },
    },
    'includes fork'
  )
  assert.deepEqual(
    JSON.stringify(forkjoin),
    JSON.stringify({
      do: {
        out: { ok: { x: 1 } },
        fx: { fork: [{ '/': run.toString() }], join: { '/': run.toString() } },
      },
    })
  )

  const { error } = fail('boom')
  const crash = Provider.error(error)
  assert.deepEqual(crash.result, { error })
  assert.deepEqual(ok.effects, { fork: [] })
  assert.deepEqual(
    JSON.stringify(crash),
    JSON.stringify({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    })
  )

  const recover = crash.join(run)
  assert.equal(
    // @ts-expect-error - has no method
    recover.join,
    undefined
  )
  assert.deepEqual(crash.result, { error }, 'does not mutate')
  assert.deepEqual(crash.effects, { fork: [] })

  assert.deepEqual(
    recover.do,
    {
      out: { error },
      fx: { fork: [], join: run },
    },
    'includes join'
  )
  assert.deepEqual(
    JSON.stringify(recover),
    JSON.stringify({
      do: {
        out: { error },
        fx: { fork: [], join: { '/': run.toString() } },
      },
    })
  )

  const errorfork = crash.fork(run)

  assert.deepEqual(crash.result, { error }, 'does not mutate')
  assert.deepEqual(crash.effects, { fork: [] })

  assert.deepEqual(
    errorfork.do,
    {
      out: { error },
      fx: { fork: [run] },
    },
    'includes join'
  )
  assert.deepEqual(
    JSON.stringify(errorfork),
    JSON.stringify({
      do: {
        out: { error },
        fx: { fork: [{ '/': run.toString() }] },
      },
    })
  )

  /** @type {API.Run} */
  const spawn = parseLink('bafkqaalb')
  const concurrent = errorfork.fork(spawn)

  assert.deepEqual(concurrent.do, {
    out: { error },
    fx: { fork: [run, spawn] },
  })

  assert.deepEqual(
    JSON.stringify(concurrent),
    JSON.stringify({
      do: {
        out: { error },
        fx: {
          fork: [{ '/': run.toString() }, { '/': spawn.toString() }],
        },
      },
    })
  )
})

/**
 * @template {Record<string, any>} Service
 * @param {Service} service
 */
const setup = service => {
  const provider = Server.create({
    id: w3,
    service,
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
  })

  const consumer = Client.connect({
    id: alice,
    codec: CAR.outbound,
    channel: provider,
  })

  return { provider, consumer }
}

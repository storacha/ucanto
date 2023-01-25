import * as API from '../src/api.js'
import { DID as Principal } from '@ucanto/core'
import { capability, Schema } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import { CAR } from '@ucanto/transport'
import { result, task } from '../src/agent.js'
import * as Agent from '../src/agent.js'
import { test, assert } from './test.js'

test('create resource', () => {
  const Space = Schema.DID.match({ method: 'key' })
  const Unit = Schema.struct({})
  const Echo = Schema.struct({
    message: Schema.string(),
  })
  const EchoError = Schema.struct({
    name: 'EchoError',
  })

  const Add = Schema.struct({
    size: Schema.integer(),
    link: Schema.Link.link(),
    origin: Schema.Link.link().optional(),
  })

  const Allocate = Schema.struct({
    size: Schema.integer(),
    link: Schema.Link.link(),

    proof: Schema.enum(['store/add']).optional(),
  })

  const out = Allocate.shape.proof.read({})
  if (!out?.error) {
    const out2 = { ...out }
  }

  const api = Agent.resource(Space, {
    debug: {
      _: Unit,
      echo: task({
        in: Echo,
        out: result(Echo, EchoError),
      }),
    },
  })

  api.capabilities.debug.echo

  assert.equal(typeof api.from, 'function')
  assert.throws(
    () =>
      // @ts-expect-error
      api.from('did:web:web3.storage'),
    /Expected a did:key: but got "did:web/
  )

  const space = api.from('did:key:zAlice')
  assert.equal(typeof space.debug, 'object')
  assert.equal(typeof space.debug.echo, 'function')
  const echo = space.debug.echo({ message: 'hello world' })

  assert.equal(echo.can, 'debug/echo')
  assert.equal(echo.with, 'did:key:zAlice')
  assert.deepEqual(echo.in, {
    message: 'hello world',
  })
  console.log(echo)
})

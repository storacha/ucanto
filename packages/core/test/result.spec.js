import { assert, test } from './test.js'
import { ok, fail, error, Failure } from '../src/lib.js'

test('Result.ok', async () => {
  assert.deepEqual(ok(1), { ok: 1 })
  assert.deepEqual(ok('hello'), { ok: 'hello' })
  assert.deepEqual(ok(true), { ok: true })
  assert.deepEqual(ok(false), { ok: false })
  assert.deepEqual(ok({ x: 1, y: 2 }), { ok: { x: 1, y: 2 } })

  assert.throws(
    // @ts-expect-error
    () => ok(),
    /consider ok\({}\) instead/
  )

  assert.throws(
    // @ts-expect-error
    () => ok(undefined),
    /consider ok\({}\) instead/
  )

  assert.throws(
    // @ts-expect-error
    () => ok(null),
    /consider ok\({}\) instead/
  )
})

test('Result.error', async () => {
  assert.deepEqual(error(1), { error: 1 })
  assert.deepEqual(error('hello'), { error: 'hello' })
  assert.deepEqual(error(true), { error: true })
  assert.deepEqual(error(false), { error: false })
  assert.deepEqual(error({ x: 1, y: 2 }), { error: { x: 1, y: 2 } })

  assert.throws(
    // @ts-expect-error
    () => error(),
    /consider passing an error/
  )

  assert.throws(
    // @ts-expect-error
    () => error(undefined),
    /consider passing an error/
  )

  assert.throws(
    // @ts-expect-error
    () => error(null),
    /consider passing an error/
  )
})

test('Result.fail', async () => {
  const error = fail('boom')

  assert.equal(error.error.message, 'boom')
  assert.equal(error.error.name, 'Error')
  assert.equal(error.error instanceof Error, true)
  assert.equal(typeof error.error.stack, 'string')
  assert.equal(
    JSON.stringify(error),
    JSON.stringify({
      error: {
        name: 'Error',
        message: 'boom',
        stack: error.error.stack,
      },
    })
  )
})

test('Result.Failure', async () => {
  const error = new Failure('boom')
  assert.equal(error.describe(), error.toString())
  assert.equal(error.message, 'boom')

  class Boom extends Failure {
    constructor() {
      super()
      this.name = 'Boom'
    }
    describe() {
      return 'BOOM'
    }
  }

  const boom = new Boom()
  assert.equal(boom.message, 'BOOM')
  assert.equal(boom.name, 'Boom')
  assert.deepEqual(
    JSON.stringify(boom),
    JSON.stringify({
      name: 'Boom',
      message: 'BOOM',
      stack: boom.stack,
    })
  )
})

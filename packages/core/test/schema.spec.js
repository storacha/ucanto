import { test, assert, matchError } from './test.js'
import * as Schema from '../src/schema.js'
import fixtures from './schema/fixtures.js'

for (const { input, schema, expect, inputLabel, skip, only } of fixtures()) {
  const unit = skip ? test.skip : only ? test.only : test

  unit(`${schema}.tryFrom(${inputLabel})`, () => {
    const result = schema.tryFrom(input)

    if (expect.error) {
      // console.log(`${schema}.tryFrom(${inputLabel})`, result, expect.error)
      matchError(result, expect.error)
    } else {
      assert.deepEqual(
        result.ok,
        // if expected value is set to undefined use input
        expect.value === undefined ? input : expect.value
      )
    }
  })

  unit(`${schema}.from(${inputLabel})`, () => {
    if (expect.error) {
      assert.throws(() => schema.from(input), expect.error)
    } else {
      assert.deepEqual(
        schema.from(input),
        // if expected value is set to undefined use input
        expect.value === undefined ? input : expect.value
      )
    }
  })

  unit(`${schema}.is(${inputLabel})`, () => {
    assert.equal(schema.is(input), !expect.error)
  })
}

test('string startsWith & endsWith', () => {
  const impossible = Schema.string().startsWith('hello').startsWith('hi')
  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.equal(
    impossible.toString(),
    'string().refine(startsWith("hello")).refine(startsWith("hi"))'
  )

  assert.deepInclude(impossible.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string().startsWith('hello').startsWith('hello ')
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.deepEqual(hello.tryFrom('hello world'), { ok: 'hello world' })
})

test('string startsWith', () => {
  /** @type {Schema.StringSchema<`hello${string}`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`hello${string}`>} */
  const hello = Schema.string().startsWith('hello')

  assert.deepEqual(hello.tryFrom('hello world!'), { ok: 'hello world!' })
  assert.deepInclude(hello.tryFrom('hi world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world"`,
  })
})

test('string endsWith', () => {
  /** @type {Schema.StringSchema<`${string} world`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`${string} world`>} */
  const greet = Schema.string().endsWith(' world')

  assert.deepEqual(greet.tryFrom('hello world'), { ok: 'hello world' })
  assert.deepEqual(greet.tryFrom('hi world'), { ok: 'hi world' })
  assert.deepInclude(greet.tryFrom('hello world!').error, {
    name: 'SchemaError',
    message: `Expect string to end with " world" instead got "hello world!"`,
  })
})

test('string startsWith/endsWith', () => {
  /** @type {Schema.StringSchema<`hello${string}!`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`hello${string}` & `${string}!`>} */
  const hello1 = Schema.string().startsWith('hello').endsWith('!')
  /** @type {Schema.StringSchema<`hello${string}` & `${string}!`>} */
  const hello2 = Schema.string().endsWith('!').startsWith('hello')

  assert.equal(
    hello1.toString(),
    `string().refine(startsWith("hello")).refine(endsWith("!"))`
  )
  assert.equal(
    hello2.toString(),
    `string().refine(endsWith("!")).refine(startsWith("hello"))`
  )

  assert.deepEqual(hello1.tryFrom('hello world!'), { ok: 'hello world!' })
  assert.deepEqual(hello2.tryFrom('hello world!'), { ok: 'hello world!' })
  assert.deepInclude(hello1.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to end with "!" instead got "hello world"`,
  })

  assert.deepInclude(hello2.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to end with "!" instead got "hello world"`,
  })

  assert.deepInclude(hello1.tryFrom('hi world!').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world!"`,
  })

  assert.deepInclude(hello2.tryFrom('hi world!').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world!"`,
  })
})

test('string startsWith & endsWith', () => {
  const impossible = Schema.string().startsWith('hello').startsWith('hi')
  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.deepInclude(impossible.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string().startsWith('hello').startsWith('hello ')
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.deepEqual(hello.tryFrom('hello world'), { ok: 'hello world' })
})

test('string().refine', () => {
  const impossible = Schema.string()
    .refine(Schema.startsWith('hello'))
    // @ts-expect-error - catches invalid type
    .refine(Schema.startsWith('hi'))

  const typeofImpossible = impossible

  assert.deepInclude(impossible.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.tryFrom('hello world').error, {
    name: 'SchemaError',
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string()
    .refine(Schema.startsWith('hello'))
    .refine(Schema.startsWith('hello '))

  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.deepEqual(hello.tryFrom('hello world'), { ok: 'hello world' })

  const greet = hello.refine({
    /**
     * @template {string} In
     * @param {In} hello
     */
    tryFrom(hello) {
      if (hello.length === 11) {
        return Schema.ok(/** @type {In & {length: 11}} */ (hello))
      } else {
        return Schema.error(`Expected string with 11 chars`)
      }
    },
  })
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}` & { length: 11 }>} */
  const typeofGreet = greet

  assert.equal(
    greet.tryFrom('hello world').ok,
    /** @type {unknown} */ ('hello world')
  )
  assert.equal(
    greet.tryFrom('hello Julia').ok,
    /** @type {unknown} */ ('hello Julia')
  )

  assert.deepInclude(greet.tryFrom('hello Jack').error, {
    name: 'SchemaError',
    message: 'Expected string with 11 chars',
  })
})

test.skip('never().default()', () => {
  assert.throws(
    () =>
      Schema.never()
        // @ts-expect-error - no value satisfies default
        .implicit('hello'),
    /Expected value of type never instead got "hello"/
  )
})

test.skip('literal("foo").default("bar") throws', () => {
  assert.throws(
    () =>
      Schema.literal('foo')
        // @ts-expect-error - no value satisfies default
        .default('bar'),
    /Expected literal "foo" instead got "bar"/
  )
})

test('default on literal has default', () => {
  const schema = Schema.literal('foo').implicit()

  assert.deepEqual(schema.tryFrom(undefined), Schema.ok('foo'))
})

test('literal has value field', () => {
  assert.deepEqual(Schema.literal('foo').value, 'foo')
})

test('.default().optional() is noop', () => {
  const schema = Schema.string().implicit('hello')
  assert.equal(schema.optional(), schema)
})

test('optional().optional() is noop', () => {
  const schema = Schema.string().optional()
  assert.equal(schema.optional(), schema)
})

test('.element of array', () => {
  const schema = Schema.string()
  assert.equal(Schema.array(schema).element, schema)
})

test('.key & .value of dictionary', () => {
  const value = Schema.struct({})
  const key = Schema.enum(['x', 'y'])
  const schema = Schema.dictionary({ value, key })

  assert.deepEqual(schema.value, value)
  assert.deepEqual(schema.key, key)

  assert.deepEqual(Schema.dictionary({ value }).key, Schema.string())
})

test('struct', () => {
  const Point = Schema.struct({
    type: 'Point',
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const p1 = Point.tryFrom({
    x: 1,
    y: 2,
  })
  assert.equal(!p1.ok, true)

  matchError(p1, /field "type".*expect.*"Point".*got undefined/is)

  const p2 = Point.tryFrom({
    type: 'Point',
    x: 1,
    y: 1,
  })
  assert.deepEqual(p2, {
    ok: {
      type: 'Point',
      x: Schema.integer().from(1),
      y: Schema.integer().from(1),
    },
  })

  const p3 = Point.tryFrom({
    type: 'Point',
    x: 1,
    y: 1.1,
  })

  assert.equal(!p3.ok, true)
  matchError(p3, /field "y".*expect.*integer.*got 1.1/is)

  matchError(
    // @ts-expect-error - bad input
    Point.tryFrom(['h', 'e', 'l', null, 'l', 'o']),
    /Expected value of type object instead got array/
  )
})

test('struct with defaults', () => {
  const Point = Schema.struct({
    x: Schema.number().implicit(0),
    y: Schema.number().implicit(0),
  })

  assert.deepEqual(Point.tryFrom({}), { ok: { x: 0, y: 0 } })
  assert.deepEqual(Point.tryFrom({ x: 2 }), { ok: { x: 2, y: 0 } })
  assert.deepEqual(Point.tryFrom({ x: 2, y: 7 }), { ok: { x: 2, y: 7 } })
  assert.deepEqual(Point.tryFrom({ y: 7 }), { ok: { x: 0, y: 7 } })
})

test('struct with literals', () => {
  const Point = Schema.struct({
    z: 0,
    x: Schema.number(),
    y: Schema.number(),
  })

  assert.deepEqual(Point.tryFrom({ x: 0, y: 0, z: 0 }), {
    ok: { x: 0, y: 0, z: 0 },
  })
  matchError(Point.tryFrom({ x: 1, y: 1, z: 1 }), /"z".*expect.* 0 .* got 1/is)
})

test('bad struct def', () => {
  assert.throws(
    () =>
      Schema.struct({
        name: Schema.string(),
        // @ts-expect-error
        toString: () => 'hello',
      }),
    /Invalid struct field "toString", expected schema or literal, instead got function/
  )
})

test('struct with null literal', () => {
  const schema = Schema.struct({ a: null, b: true, c: Schema.string() })

  assert.deepEqual(schema.tryFrom({ a: null, b: true, c: 'hi' }), {
    ok: {
      a: null,
      b: true,
      c: 'hi',
    },
  })

  matchError(
    schema.tryFrom({ a: null, b: false, c: '' }),
    /"b".*expect.* true .* got false/is
  )

  matchError(
    schema.tryFrom({ b: true, c: '' }),
    /"a".*expect.* null .* got undefined/is
  )
})

test('lessThan', () => {
  const schema = Schema.number().lessThan(100)

  assert.deepEqual(schema.tryFrom(10), { ok: 10 })
  matchError(schema.tryFrom(127), /127 < 100/)
  matchError(schema.tryFrom(Infinity), /Infinity < 100/)
  matchError(schema.tryFrom(NaN), /NaN < 100/)
})

test('greaterThan', () => {
  const schema = Schema.number().greaterThan(100)

  assert.deepEqual(schema.tryFrom(127), { ok: 127 })
  matchError(schema.tryFrom(12), /12 > 100/)
  assert.deepEqual(schema.tryFrom(Infinity), { ok: Infinity })
  matchError(schema.tryFrom(NaN), /NaN > 100/)
})

test('number().greaterThan().lessThan()', () => {
  const schema = Schema.number().greaterThan(3).lessThan(117)

  assert.deepEqual(schema.tryFrom(4), { ok: 4 })
  assert.deepEqual(schema.tryFrom(116), { ok: 116 })
  matchError(schema.tryFrom(117), /117 < 117/)
  matchError(schema.tryFrom(3), /3 > 3/)
  matchError(schema.tryFrom(127), /127 < 117/)
  matchError(schema.tryFrom(0), /0 > 3/)
  matchError(schema.tryFrom(Infinity), /Infinity < 117/)
  matchError(schema.tryFrom(NaN), /NaN > 3/)
})

test('enum', () => {
  const schema = Schema.enum(['Red', 'Green', 'Blue'])
  assert.equal(schema.toString(), 'Red|Green|Blue')
  assert.deepEqual(schema.tryFrom('Red'), { ok: 'Red' })
  assert.deepEqual(schema.tryFrom('Blue'), { ok: 'Blue' })
  assert.deepEqual(schema.tryFrom('Green'), { ok: 'Green' })

  matchError(schema.tryFrom('red'), /expect.* Red\|Green\|Blue .* got "red"/is)
  matchError(
    schema.tryFrom(
      // @ts-expect-error - invalid arg
      5
    ),
    /expect.* Red\|Green\|Blue .* got 5/is
  )
})

test('tuple', () => {
  const schema = Schema.tuple([Schema.string(), Schema.integer()])
  matchError(
    schema.tryFrom([
      ,
      // @ts-expect-error - not an int
      undefined,
    ]),
    /invalid element at 0.*expect.*string.*got undefined/is
  )
  matchError(
    schema.tryFrom(
      // @ts-expect-error - invalid arg
      [0, 'hello']
    ),
    /invalid element at 0.*expect.*string.*got 0/is
  )
  matchError(
    schema.tryFrom(
      // @ts-expect-error - invalid arg
      ['0', '1']
    ),
    /invalid element at 1.*expect.*integer.*got "1"/is
  )
  matchError(
    schema.tryFrom(['0', Infinity]),
    /invalid element at 1.*expect.*integer.*got Infinity/is
  )
  matchError(
    schema.tryFrom(['0', NaN]),
    /invalid element at 1.*expect.*integer.*got NaN/is
  )
  matchError(
    schema.tryFrom(['0', 0.2]),
    /invalid element at 1.*expect.*integer.*got 0.2/is
  )

  assert.deepEqual(schema.tryFrom(['x', 0]), { ok: ['x', 0] })
})

test('extend API', () => {
  {
    /**
     * @template {string} M
     * @implements {Schema.Schema<`did:${M}:${string}`, string>}
     * @extends {Schema.API<`did:${M}:${string}`, string, M>}
     */
    class DIDString extends Schema.API {
      /**
       * @param {string} source
       * @param {M} method
       */
      readWith(source, method) {
        const string = String(source)
        if (string.startsWith(`did:${method}:`)) {
          return { ok: /** @type {`did:${M}:${string}`} */ (method) }
        } else {
          return Schema.error(
            `Expected did:${method} URI instead got ${string}`
          )
        }
      }
    }

    const schema = new DIDString('key')
    assert.equal(schema.toString(), 'new DIDString()')
    matchError(
      schema.tryFrom(
        // @ts-expect-error
        54
      ),
      /Expected did:key URI/
    )

    matchError(
      schema.tryFrom('did:echo:foo'),
      /Expected did:key URI instead got did:echo:foo/
    )

    const didKey = Schema.string().refine(new DIDString('key'))
    matchError(
      didKey.tryFrom(
        // @ts-expect-error - invalid arg
        54
      ),
      /Expect.* string instead got 54/is
    )
  }
})

test('errors', () => {
  const { error } = Schema.error('boom!')
  const json = JSON.parse(JSON.stringify(error))
  assert.deepInclude(json, {
    name: 'SchemaError',
    message: 'boom!',
    stack: error.stack,
  })

  assert.equal(error instanceof Error, true)
})

test('refine', () => {
  /**
   * @template T
   */
  class NonEmpty extends Schema.API {
    /**
     * @param {T[]} array
     */
    tryFrom(array) {
      return array.length > 0
        ? Schema.ok(array)
        : Schema.error('Array expected to have elements')
    }
  }

  const schema = Schema.array(Schema.string()).refine(new NonEmpty())

  assert.equal(schema.toString(), 'array(string()).refine(new NonEmpty())')
  matchError(schema.tryFrom([]), /Array expected to have elements/)
  assert.deepEqual(schema.tryFrom(['hello', 'world']), {
    ok: ['hello', 'world'],
  })
  matchError(
    schema.tryFrom(
      // @ts-expect-error - invalid arg
      null
    ),
    /expect.* array .*got null/is
  )
})

test('brand', () => {
  const digit = Schema.integer()
    .refine({
      tryFrom(n) {
        return n >= 0 && n <= 9
          ? Schema.ok(n)
          : Schema.error(`Expected digit but got ${n}`)
      },
      tryTo(n) {
        return { ok: n }
      },
    })
    .brand('digit')

  matchError(digit.tryFrom(10), /Expected digit but got 10/)
  matchError(digit.tryFrom(2.7), /Expected value of type integer/)
  assert.equal(digit.from(2), 2)

  /** @param {Schema.Infer<typeof digit>} n */
  const fromDigit = n => n

  const three = digit.from(3)

  // @ts-expect-error - 3 is not known to be digit
  fromDigit(3)
  fromDigit(three)

  /** @type {Schema.Integer} */
  const is_int = three
  /** @type {Schema.Branded<number, "digit">} */
  const is_digit = three
  /** @type {Schema.Branded<Schema.Integer, "digit">} */
  const is_int_digit = three
})

test('optional.default removes undefined from type', () => {
  const schema1 = Schema.string().optional()

  /** @type {Schema.Schema<string>} */
  // @ts-expect-error - Schema<string | undefined> is not assignable
  const castError = schema1

  const schema2 = schema1.implicit('')
  /** @type {Schema.Schema<string>} */
  const castOk = schema2

  assert.deepEqual(schema1.tryFrom(undefined), { ok: undefined })
  assert.deepEqual(schema2.tryFrom(undefined), { ok: '' })
})

test('.default("one").default("two")', () => {
  const schema = Schema.string().implicit('one').implicit('two')

  assert.equal(schema.value, 'two')
  assert.deepEqual(schema.tryFrom(undefined), { ok: 'two' })
  assert.deepEqual(schema.tryFrom('three'), { ok: 'three' })
})

test.skip('default throws on invalid default', () => {
  assert.throws(
    () =>
      Schema.string().implicit(
        // @ts-expect-error - number is not assignable to string
        101
      ),
    /expect.* string .* got 101/is
  )
})

test('unknown with default', () => {
  assert.throws(
    () => Schema.unknown().implicit(undefined),
    /undefined is not a valid default/
  )
})

test('default swaps undefined even if decodes to undefined', () => {
  /** @type {Schema.Schema} */
  const schema = Schema.unknown().refine({
    tryFrom(value) {
      return { ok: value === null ? undefined : value }
    },
    tryTo(value) {
      return { ok: value === null ? undefined : value }
    },
  })

  assert.deepEqual(schema.implicit('X').tryFrom(null), { ok: 'X' })
})

test('record defaults', () => {
  const Point = Schema.struct({
    x: Schema.integer().implicit(1),
    y: Schema.integer().optional(),
  })

  const Point3D = Point.extend({
    z: Schema.integer(),
  })

  matchError(
    Point.tryFrom(
      // @ts-expect-error - bad input
      undefined
    ),
    /expect.* object .* got undefined/is
  )
  assert.deepEqual(Point.create(), {
    x: 1,
  })
  assert.deepEqual(Point.create(undefined), {
    x: 1,
  })

  assert.deepEqual(Point.tryFrom({}), {
    ok: {
      x: 1,
    },
  })

  assert.deepEqual(Point.tryFrom({ y: 2 }), {
    ok: {
      x: 1,
      y: 2,
    },
  })

  assert.deepEqual(Point.tryFrom({ x: 2, y: 2 }), {
    ok: {
      x: 2,
      y: 2,
    },
  })

  const Line = Schema.struct({
    start: Point.implicit({ x: 0 }),
    end: Point.implicit({ x: 1, y: 3 }),
  })

  assert.deepEqual(Line.create(), {
    start: { x: 0 },
    end: { x: 1, y: 3 },
  })
})

test('bytes schema', () => {
  const schema = Schema.bytes()
  matchError(schema.read(undefined), /expect.* Uint8Array .* got undefined/is)

  const bytes = new Uint8Array([1, 2, 3])

  assert.equal(schema.read(bytes).ok, bytes, 'returns same bytes back')

  matchError(
    schema.read(bytes.buffer),
    /expect.* Uint8Array .* got ArrayBuffer/is
  )

  matchError(
    schema.read(new Int8Array(bytes.buffer)),
    /expect.* Uint8Array .* got Int8Array/is
  )

  matchError(schema.read([...bytes]), /expect.* Uint8Array .* got array/is)
})

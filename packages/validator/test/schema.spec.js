import { test, assert } from './test.js'
import * as Schema from '../src/decoder/core.js'

/**
 * @param {unknown} [value]
 * @return {Expect}
 */
export const pass = value => ({ value })

const fail = Object.assign(
  /**
   * @param {object} options
   * @param {unknown} [options.got]
   * @param {string} [options.expect]
   */
  ({ got = '.*', expect = '.*' }) => ({
    error: new RegExp(`expect.*${expect}.* got ${got}`, 'is'),
  }),
  {
    /**
     * @param {string} pattern
     */
    as: pattern => ({
      error: new RegExp(pattern, 'is'),
    }),
    /**
     * @param {number} at
     * @param {object} options
     * @param {unknown} [options.got]
     * @param {unknown} [options.expect]
     */
    at: (at, { got = '.*', expect = [] }) => {
      const variants = Array.isArray(expect)
        ? expect.join(`.* expect.*`)
        : expect
      return {
        error: new RegExp(`at ${at}.* expect.*${variants} .* got ${got}`, 'is'),
      }
    },
  }
)

/**
 * @param {unknown} source
 * @returns {string}
 */
const display = source => {
  const type = typeof source
  switch (type) {
    case 'boolean':
    case 'string':
      return JSON.stringify(source)
    // if these types we do not want JSON.stringify as it may mess things up
    // eg turn NaN and Infinity to null
    case 'bigint':
    case 'number':
    case 'symbol':
    case 'undefined':
      return String(source)
    case 'object': {
      if (source === null) {
        return 'null'
      }

      if (Array.isArray(source)) {
        return `[${source.map(display).join(', ')}]`
      }

      return `{${Object.entries(Object(source)).map(
        ([key, value]) => `${key}:${display(value)}`
      )}}`
    }
    default:
      return String(source)
  }
}

/**
 * @param {Partial<Fixture>} source
 * @returns {Fixture}
 */

const fixture = ({ in: input, got = input, array, ...expect }) => {
  return {
    in: input,
    got,
    any: fail({ got }),
    unknown: { any: fail({ expect: 'unknown', got }), ...expect.unknown },
    never: { any: fail({ expect: 'never', got }), ...expect.never },
    string: { any: fail({ expect: 'string', got }), ...expect.string },
    number: { any: fail({ expect: 'number', got }), ...expect.number },
    integer: { any: fail({ expect: 'number', got }), ...expect.integer },
    float: { any: fail({ expect: 'number', got }), ...expect.float },
    literal: {
      any: { any: fail({ expect: 'literal', got }) },
      ...Object.fromEntries(
        Object.entries(expect.literal || {}).map(([key, value]) => {
          return [
            key,
            {
              any: fail({ expect: 'literal', got }),
              ...value,
            },
          ]
        })
      ),
    },
    array: {
      any: array?.any || fail({ expect: 'array', got }),
      string: {
        ...array?.string,
      },
      number: {
        ...array?.number,
      },
      never: {
        ...array?.never,
      },
      unknown: {
        ...array?.unknown,
      },
    },
    tuple: {
      any: expect.tuple?.any || fail({ expect: 'array', got }),
      strNstr: {
        any: fail({ expect: 'array', got }),
        ...expect.tuple?.strNstr,
      },
      strNfloat: {
        any: fail({ expect: 'array', got }),
        ...expect.tuple?.strNstr,
      },
    },
  }
}
/**
 * @typedef {{error?:undefined, value:unknown}|{error:RegExp}} Expect
 * @typedef {{
 *   any?: Expect
 *   nullable?: Expect
 *   optional?: Expect
 *   default?: (input:unknown) => Expect
 * }} ExpectGroup
 * @typedef {{
 * in:any
 * got: unknown
 * any: Expect
 * unknown: ExpectGroup,
 * never: ExpectGroup
 * string: ExpectGroup,
 * number: ExpectGroup,
 * integer: ExpectGroup,
 * float: ExpectGroup,
 * literal: {
 *   any?: ExpectGroup,
 *   [key:string]: ExpectGroup|undefined
 * },
 * array: {
 *   any?: Expect
 *   string?: ExpectGroup
 *   number?: ExpectGroup
 *   unknown?: ExpectGroup
 *   never?: ExpectGroup
 * }
 * tuple: {
 *   any?: Expect
 *   strNstr?: ExpectGroup
 *   strNfloat?: ExpectGroup
 * }
 * }} Fixture
 *
 * @type {Partial<Fixture>[]}
 */
const source = [
  {
    in: 'hello',
    got: '"hello"',
    string: { any: pass() },
    unknown: { any: pass() },
    literal: { hello: { any: pass() } },
  },
  {
    in: new String('hello'),
    got: 'object',
    unknown: { any: pass() },
  },
  {
    in: null,
    got: 'null',
    string: {
      nullable: pass(null),
    },
    number: {
      nullable: pass(),
    },
    integer: {
      nullable: pass(),
    },
    float: {
      nullable: pass(),
    },
    unknown: { any: pass() },
    never: {
      nullable: pass(),
    },
    literal: {
      hello: {
        nullable: pass(),
      },
    },
  },
  {
    in: undefined,
    string: {
      optional: pass(),
      default: value => pass(value),
    },
    number: {
      optional: pass(),
      default: value => pass(value),
    },
    integer: {
      optional: pass(),
      default: value => pass(value),
    },
    float: {
      optional: pass(),
      default: value => pass(value),
    },
    unknown: { any: pass() },
    never: {
      optional: pass(),
    },
    literal: {
      hello: {
        optional: pass(),
        default: pass,
      },
    },
  },
  {
    in: Infinity,
    got: 'Infinity',
    number: { any: pass() },
    integer: { any: fail({ expect: 'integer', got: 'Infinity' }) },
    float: { any: fail({ expect: 'float', got: 'Infinity' }) },
    unknown: { any: pass() },
  },
  {
    in: NaN,
    got: 'NaN',
    number: { any: pass() },
    integer: { any: fail({ expect: 'integer', got: 'NaN' }) },
    float: { any: fail({ expect: 'float', got: 'NaN' }) },
    unknown: { any: pass() },
  },
  {
    in: 101,
    number: { any: pass() },
    integer: { any: pass() },
    float: { any: pass() },
    unknown: { any: pass() },
  },
  {
    in: 9.8,
    number: { any: pass() },
    integer: { any: fail({ expect: 'integer', got: '9.8' }) },
    float: { any: pass() },
    unknown: { any: pass() },
  },
  {
    in: true,
    unknown: { any: pass() },
  },
  {
    in: false,
    unknown: { any: pass() },
  },
  {
    in: Symbol.for('bye'),
    got: 'Symbol\\(bye\\)',
    unknown: { any: pass() },
  },
  {
    in: () => 'hello',
    got: 'function',
    unknown: { any: pass() },
  },
  {
    in: {},
    got: 'object',
    unknown: { any: pass() },
  },
  {
    in: [],
    got: 'array',
    array: { any: pass() },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.as('Array must contain exactly 2 elements'),
      },
    },
  },
  {
    in: [, undefined],
    got: 'array',
    array: {
      any: fail.at(0, { got: undefined }),
      string: {
        optional: pass(),
        nullable: fail.at(0, { got: undefined, expect: 'null' }),
        default: v => pass([v, v]),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.at(0, { got: undefined, expect: 'string' }),
      },
    },
  },
  {
    in: ['hello', 'world', 1, '?'],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: {
        any: fail.at(2, { got: 1, expect: 'string' }),
        nullable: fail.at(2, {
          expect: ['string', 'null'],
          got: 1,
        }),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: { any: fail.as('Array must contain exactly 2 elements') },
    },
  },
  {
    in: ['hello', , 'world'],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: {
        any: fail.at(1, { expect: 'string', got: undefined }),
        nullable: fail.at(1, {
          expect: ['string', 'null'],
          got: undefined,
        }),
        default: v => pass(['hello', v, 'world']),
        optional: pass(),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.as('Array must contain exactly 2 elements'),
      },
    },
  },
  {
    in: ['h', 'e', 'l', null, 'l', 'o'],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"h"' }),
      string: {
        any: fail.at(3, { expect: 'string', got: 'null' }),
        nullable: pass(),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: { any: fail.as('Array must contain exactly 2 elements') },
    },
  },
  {
    in: ['hello', new String('world')],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: {
        any: fail.at(1, { expect: 'string', got: 'object' }),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.at(1, { got: 'object' }),
      },
    },
  },
  {
    in: ['1', 2.1],
    got: 'array',
    array: {
      any: fail.at(0, { got: 1 }),
      string: {
        any: fail.at(1, { expect: 'string', got: 2.1 }),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.at(1, { got: 2.1 }),
      },
      strNfloat: {
        any: pass(),
      },
    },
  },
  {
    in: ['true', 'false', true],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"true"' }),
      string: {
        any: fail.at(2, { expect: 'string', got: true }),
      },
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
    tuple: {
      strNstr: { any: fail.as('Array must contain exactly 2 elements') },
    },
  },
  {
    in: ['hello', Symbol.for('world')],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: {
        any: fail.at(1, { expect: 'string', got: 'Symbol\\(world\\)' }),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.at(1, { got: 'Symbol\\(world\\)' }),
      },
    },
  },
  {
    in: ['hello', () => 'world'],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: {
        any: fail.at(1, { got: 'function' }),
      },
    },
    unknown: { any: pass() },
    tuple: {
      strNstr: {
        any: fail.at(1, { got: 'function' }),
      },
    },
  },
]
const fixtures = source.map(fixture)

for (const fixture of fixtures) {
  const label = `${fixture.in === null ? 'null' : typeof fixture.in}`

  for (const { schema, expect } of [
    {
      schema: Schema.never(),
      expect: fixture.never.any || fixture.any,
    },
    {
      schema: Schema.never().nullable(),
      expect: fixture.never.nullable || fixture.never.any || fixture.any,
    },
    {
      schema: Schema.never().optional(),
      expect: fixture.never.optional || fixture.never.any || fixture.any,
    },
    {
      schema: Schema.unknown(),
      expect: fixture.unknown.any || fixture.any,
    },
    {
      schema: Schema.unknown().optional(),
      expect: fixture.unknown.any || fixture.any,
    },
    {
      schema: Schema.unknown().nullable(),
      expect: fixture.unknown.any || fixture.any,
    },
    {
      schema: Schema.unknown().default('DEFAULT'),
      expect: fixture.unknown.any || fixture.any,
    },
    {
      schema: Schema.string(),
      expect: fixture.string.any || fixture.any,
    },
    {
      schema: Schema.string().optional(),
      expect: fixture.string.optional || fixture.string.any || fixture.any,
    },
    {
      schema: Schema.string().nullable(),
      expect: fixture.string.nullable || fixture.string.any || fixture.any,
    },
    {
      schema: Schema.string().default('DEFAULT'),
      expect:
        (fixture.string.default && fixture.string.default('DEFAULT')) ||
        fixture.string.any ||
        fixture.any,
    },
    {
      schema: Schema.number(),
      expect: fixture.number.any || fixture.any,
    },
    {
      schema: Schema.number().optional(),
      expect: fixture.number.optional || fixture.number.any || fixture.any,
    },
    {
      schema: Schema.number().nullable(),
      expect: fixture.number.nullable || fixture.number.any || fixture.any,
    },
    {
      schema: Schema.number().default(17),
      expect:
        (fixture.number.default && fixture.number.default(17)) ||
        fixture.number.any ||
        fixture.any,
    },
    {
      schema: Schema.integer(),
      expect: fixture.integer.any || fixture.any,
    },
    {
      schema: Schema.integer().optional(),
      expect: fixture.integer.optional || fixture.integer.any || fixture.any,
    },
    {
      schema: Schema.integer().nullable(),
      expect: fixture.integer.nullable || fixture.integer.any || fixture.any,
    },
    {
      schema: Schema.integer().default(17),
      expect:
        (fixture.integer.default && fixture.integer.default(17)) ||
        fixture.integer.any ||
        fixture.any,
    },
    {
      schema: Schema.float(),
      expect: fixture.float.any || fixture.any,
    },
    {
      schema: Schema.float().optional(),
      expect: fixture.float.optional || fixture.float.any || fixture.any,
    },
    {
      schema: Schema.float().nullable(),
      expect: fixture.float.nullable || fixture.float.any || fixture.any,
    },
    {
      schema: Schema.float().default(1.7),
      expect:
        (fixture.float.default && fixture.float.default(1.7)) ||
        fixture.float.any ||
        fixture.any,
    },
    {
      schema: Schema.array(Schema.string()),
      expect: fixture.array.string?.any || fixture.array.any || fixture.any,
    },
    {
      schema: Schema.array(Schema.string().optional()),
      expect:
        fixture.array.string?.optional ||
        fixture.array.string?.any ||
        fixture.array.any ||
        fixture.any,
    },
    {
      schema: Schema.array(Schema.string().nullable()),
      expect:
        fixture.array.string?.nullable ||
        fixture.array.string?.any ||
        fixture.array.any ||
        fixture.any,
    },
    {
      schema: Schema.array(Schema.string().default('DEFAULT')),
      expect:
        (fixture.array.string?.default &&
          fixture.array.string?.default('DEFAULT')) ||
        fixture.array.string?.any ||
        fixture.array.any ||
        fixture.any,
    },
    {
      schema: Schema.literal('foo'),
      expect:
        fixture.literal?.foo?.any || fixture.literal.any?.any || fixture.any,
    },
    {
      schema: Schema.literal('hello'),
      expect:
        fixture.literal?.hello?.any || fixture.literal.any?.any || fixture.any,
    },
    {
      schema: Schema.literal('hello').optional(),
      expect:
        fixture.literal?.hello?.optional ||
        fixture.literal?.hello?.any ||
        fixture.literal.any?.any ||
        fixture.any,
    },
    {
      schema: Schema.literal('hello').nullable(),
      expect:
        fixture.literal?.hello?.nullable ||
        fixture.literal?.hello?.any ||
        fixture.literal.any?.any ||
        fixture.any,
    },
    {
      schema: Schema.literal('hello').default('hello'),
      expect:
        (fixture.literal?.hello?.default &&
          fixture.literal?.hello?.default('hello')) ||
        fixture.literal?.hello?.any ||
        fixture.literal.any?.any ||
        fixture.any,
    },
    {
      schema: Schema.tuple([Schema.string(), Schema.string()]),
      expect: fixture.tuple.strNstr?.any || fixture.tuple.any || fixture.any,
    },
    {
      schema: Schema.tuple([Schema.string(), Schema.integer()]),
      expect: fixture.tuple.strNfloat?.any || fixture.tuple.any || fixture.any,
    },
  ]) {
    test(`${schema}.read(${display(fixture.in)})`, () => {
      const result = schema.read(fixture.in)

      if (expect.error) {
        assert.match(String(result), expect.error)
      } else {
        assert.deepEqual(
          result,
          // if expcted value is set to undefined use input
          expect.value === undefined ? fixture.in : expect.value
        )
      }
    })

    test(`${schema}.from(${display(fixture.in)})`, () => {
      if (expect.error) {
        assert.throws(() => schema.from(fixture.in), expect.error)
      } else {
        assert.deepEqual(
          schema.from(fixture.in),
          // if expcted value is set to undefined use input
          expect.value === undefined ? fixture.in : expect.value
        )
      }
    })

    test(`${schema}.is(${display(fixture.in)})`, () => {
      assert.equal(schema.is(fixture.in), !expect.error)
    })
  }
}

test('string startsWith & endsWith', () => {
  const impossible = Schema.string().startsWith('hello').startsWith('hi')
  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string().startsWith('hello').startsWith('hello ')
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.equal(hello.read('hello world'), 'hello world')
})

test('string startsWtih', () => {
  /** @type {Schema.StringSchema<`hello${string}`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`hello${string}`>} */
  const hello = Schema.string().startsWith('hello')

  assert.equal(hello.read('hello world!'), 'hello world!')
  assert.deepInclude(hello.read('hi world'), {
    error: true,
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

  assert.equal(greet.read('hello world'), 'hello world')
  assert.equal(greet.read('hi world'), 'hi world')
  assert.deepInclude(greet.read('hello world!'), {
    error: true,
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

  assert.equal(hello1.read('hello world!'), 'hello world!')
  assert.equal(hello2.read('hello world!'), 'hello world!')
  assert.deepInclude(hello1.read('hello world'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to end with "!" instead got "hello world"`,
  })
  assert.deepInclude(hello2.read('hello world'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to end with "!" instead got "hello world"`,
  })
  assert.deepInclude(hello1.read('hi world!'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world!"`,
  })
  assert.deepInclude(hello2.read('hi world!'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world!"`,
  })
})

test('string startsWith & endsWith', () => {
  const impossible = Schema.string().startsWith('hello').startsWith('hi')
  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string().startsWith('hello').startsWith('hello ')
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.equal(hello.read('hello world'), 'hello world')
})

test('string().refine', () => {
  const impossible = Schema.string()
    .refine(Schema.startsWith('hello'))
    .refine(Schema.startsWith('hi'))

  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string()
    .refine(Schema.startsWith('hello'))
    .refine(Schema.startsWith('hello '))

  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.equal(hello.read('hello world'), 'hello world')

  const greet = hello.refine({
    read(hello) {
      if (hello.length === 11) {
        return /** @type {string & {length: 11}} */ (hello)
      } else {
        return Schema.error(`Expected string with 11 chars`)
      }
    },
  })
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}` & { length: 11 }>} */
  const typeofGreet = greet

  assert.equal(
    greet.read('hello world'),
    /** @type {unknown} */ ('hello world')
  )
  assert.equal(
    greet.read('hello Julia'),
    /** @type {unknown} */ ('hello Julia')
  )

  assert.deepInclude(greet.read('hello Jack'), {
    error: true,
    message: 'Expected string with 11 chars',
  })
})

test('never().default()', () => {
  assert.throws(
    () =>
      Schema.never()
        // @ts-expect-error - no value satisfies default
        .default('hello'),
    /Can not call never\(\).default\(value\)/
  )
})

test('literal("foo").default("bar") throws', () => {
  assert.throws(
    () =>
      Schema.literal('foo')
        // @ts-expect-error - no value satisfies default
        .default('bar'),
    /Provided default does not match this literal/
  )
})

test('default on litral has default', () => {
  const schema = Schema.literal('foo').default()
  assert.equal(schema.read(undefined), 'foo')
})

test('literal has value field', () => {
  assert.equal(Schema.literal('foo').value, 'foo')
})

test('.default().optional() is noop', () => {
  const schema = Schema.string().default('hello')
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

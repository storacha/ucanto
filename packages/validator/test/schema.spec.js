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
   * @param {unknown} options.got
   * @param {string} [options.expect]
   */
  ({ got, expect = '.*' }) => ({
    error: new RegExp(`expect.*${expect}.* got ${got}`, 'is'),
  }),
  {
    /**
     * @param {number} at
     * @param {object} options
     * @param {unknown} options.got
     * @param {unknown} [options.expect]
     */
    at: (at, { got, expect = [] }) => {
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
 * @typedef {{error?:undefined, value:unknown}|{error:RegExp}} Expect
 * @typedef {{
 * in:unknown
 * unknown: {
 *   any: Expect
 *   nullable?: Expect
 *   optional?: Expect
 *   default?: (input:unknown) => Expect
 * },
 * never: {
 *   any: Expect
 *   nullable?: Expect
 *   optional?: Expect
 *   default?: (input:unknown) => Expect
 * }
 * string: {
 *   any: Expect,
 *   optional?: Expect,
 *   nullable?: Expect,
 *   default?: (input:unknown) => Expect
 * },
 * array: {
 *   any: Expect
 *   string?:Expect
 *   optionalString?:Expect
 *   nullableString?:Expect
 *   defaultString?: (input:unknown) => Expect
 *   number?:Expect
 * }
 * }} Fixture
 * @type {Fixture[]}
 */
const fixtures = [
  {
    in: 'hello',
    array: { any: fail({ expect: 'array', got: '"hello"' }) },
    string: { any: pass() },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: '"hello"' }) },
  },
  {
    in: new String('hello'),
    array: { any: fail({ expect: 'array', got: 'object' }) },
    string: { any: fail({ expect: 'string', got: 'object' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'object' }) },
  },
  {
    in: null,
    array: { any: fail({ expect: 'array', got: 'null' }) },
    string: {
      any: fail({ expect: 'string', got: 'null' }),
      nullable: pass(null),
    },
    unknown: { any: pass() },
    never: {
      any: fail({ expect: 'never', got: 'null' }),
      nullable: pass(),
    },
  },
  {
    in: undefined,
    array: { any: fail({ expect: 'array', got: undefined }) },
    string: {
      any: fail({ expect: 'string', got: undefined }),
      optional: pass(),
      default: value => pass(value),
    },
    unknown: { any: pass() },
    never: {
      any: fail({ expect: 'never', got: undefined }),
      optional: pass(),
    },
  },
  {
    in: 101,
    array: { any: fail({ expect: 'array', got: 101 }) },
    string: { any: fail({ expect: 'string', got: 101 }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 101 }) },
  },
  {
    in: 9.8,
    array: { any: fail({ expect: 'array', got: 9.8 }) },
    string: { any: fail({ expect: 'string', got: 9.8 }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 9.8 }) },
  },
  {
    in: true,
    array: { any: fail({ expect: 'array', got: true }) },
    string: { any: fail({ expect: 'string', got: true }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: true }) },
  },
  {
    in: false,
    array: { any: fail({ expect: 'array', got: false }) },
    string: { any: fail({ expect: 'string', got: false }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: false }) },
  },
  {
    in: Symbol.for('bye'),
    array: { any: fail({ expect: 'array', got: 'Symbol\\(bye\\)' }) },
    string: { any: fail({ expect: 'string', got: 'Symbol\\(bye\\)' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'Symbol\\(bye\\)' }) },
  },
  {
    in: () => 'hello',
    array: { any: fail({ expect: 'array', got: 'function' }) },
    string: { any: fail({ expect: 'string', got: 'function' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'function' }) },
  },
  {
    in: 'hello',
    array: { any: fail({ expect: 'array', got: '"hello"' }) },
    string: { any: pass() },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: '"hello"' }) },
  },
  {
    in: {},
    array: { any: fail({ expect: 'array', got: 'object' }) },
    string: { any: fail({ expect: 'string', got: 'object' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'object' }) },
  },
  {
    in: [],
    array: {
      any: pass(),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: [, undefined],
    array: {
      any: fail.at(0, { got: undefined }),
      optionalString: pass(),
      nullableString: fail.at(0, { got: undefined, expect: 'null' }),
      defaultString: v => pass([v, v]),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['hello', 'world', 1, '?'],
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: fail.at(2, { got: 1, expect: 'string' }),
      nullableString: fail.at(2, {
        expect: ['string', 'null'],
        got: 1,
      }),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['hello', , 'world'],
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: fail.at(1, { expect: 'string', got: undefined }),
      nullableString: fail.at(1, {
        expect: ['string', 'null'],
        got: undefined,
      }),
      defaultString: v => pass(['hello', v, 'world']),
      optionalString: pass(),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['h', 'e', 'l', null, 'l', 'o'],
    array: {
      any: fail.at(0, { got: '"h"' }),
      string: fail.at(3, { expect: 'string', got: 'null' }),
      nullableString: pass(),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['hello', new String('world')],
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: fail.at(1, { expect: 'string', got: 'object' }),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['1', 2.1],
    array: {
      any: fail.at(0, { got: 1 }),
      string: fail.at(1, { expect: 'string', got: 2.1 }),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['true', 'false', true],
    array: {
      any: fail.at(0, { got: '"true"' }),
      string: fail.at(2, { expect: 'string', got: true }),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['hello', Symbol.for('world')],
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: fail.at(1, { expect: 'string', got: 'Symbol\\(world\\)' }),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
  {
    in: ['hello', () => 'world'],
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: fail.at(1, { got: 'function' }),
    },
    string: { any: fail({ expect: 'string', got: 'array' }) },
    unknown: { any: pass() },
    never: { any: fail({ expect: 'never', got: 'array' }) },
  },
]

for (const fixture of fixtures) {
  const label = `${fixture.in === null ? 'null' : typeof fixture.in}`

  for (const { schema, expect } of [
    {
      schema: Schema.never(),
      expect: fixture.never.any,
    },
    {
      schema: Schema.never().nullable(),
      expect: fixture.never.nullable || fixture.never.any,
    },
    {
      schema: Schema.never().optional(),
      expect: fixture.never.optional || fixture.never.any,
    },
    {
      schema: Schema.unknown(),
      expect: fixture.unknown.any,
    },
    {
      schema: Schema.unknown().optional(),
      expect: fixture.unknown.any,
    },
    {
      schema: Schema.unknown().nullable(),
      expect: fixture.unknown.any,
    },
    {
      schema: Schema.unknown().default('DEFAULT'),
      expect: fixture.unknown.any,
    },
    {
      schema: Schema.string(),
      expect: fixture.string.any,
    },
    {
      schema: Schema.string().optional(),
      expect: fixture.string.optional || fixture.string.any,
    },
    {
      schema: Schema.string().nullable(),
      expect: fixture.string.nullable || fixture.string.any,
    },
    {
      schema: Schema.string().default('DEFAULT'),
      expect:
        (fixture.string.default && fixture.string.default('DEFAULT')) ||
        fixture.string.any,
    },
    {
      schema: Schema.array(Schema.string()),
      expect: fixture.array.string || fixture.array.any,
    },
    {
      schema: Schema.array(Schema.string().optional()),
      expect:
        fixture.array.optionalString ||
        fixture.array.string ||
        fixture.array.any,
    },
    {
      schema: Schema.array(Schema.string().nullable()),
      expect:
        fixture.array.nullableString ||
        fixture.array.string ||
        fixture.array.any,
    },
    {
      schema: Schema.array(Schema.string().default('DEFAULT')),
      expect:
        (fixture.array.defaultString &&
          fixture.array.defaultString('DEFAULT')) ||
        fixture.array.string ||
        fixture.array.any,
    },
    // ['number', Schema.number()],
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

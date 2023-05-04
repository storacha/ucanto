import { pass, fail, display } from './util.js'
import * as Schema from '../../src/schema.js'
import { string, unknown } from '../../src/schema.js'

/**
 * @typedef {import('./util.js').Expect} Expect
 *
 *
 * @typedef {{
 *   any?: Expect
 *   nullable?: Expect
 *   optional?: Expect
 *   default?: (input:unknown) => Expect
 * }} ExpectGroup
 * @typedef {{
 * skip?: boolean
 * only?: boolean
 * in:any
 * got: unknown
 * any: Expect
 * unknown: ExpectGroup,
 * never: ExpectGroup
 * string: ExpectGroup,
 * boolean: ExpectGroup
 * strartsWithHello: ExpectGroup
 * endsWithWorld: ExpectGroup
 * startsWithHelloEndsWithWorld: ExpectGroup
 * number: ExpectGroup
 * ['n > 100']?: ExpectGroup,
 * ['n < 100']?: ExpectGroup,
 * ['3 < n < 17']?: ExpectGroup,
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
 * struct: ExpectGroup
 * enum: ExpectGroup
 * stringOrNumber?: ExpectGroup
 * point2d?: ExpectGroup
 * ['Red|Green|Blue']?: ExpectGroup
 * xyz?: ExpectGroup
 * intDict?: ExpectGroup
 * pointDict?: ExpectGroup
 * dict: ExpectGroup
 * }} Fixture
 *
 * @param {Partial<Fixture>} source
 * @returns {Fixture}
 */

export const fixture = ({ in: input, got = input, array, ...expect }) => ({
  ...expect,
  in: input,
  got,
  any: fail({ got }),
  unknown: { any: fail({ expect: 'unknown', got }), ...expect.unknown },
  never: { any: fail({ expect: 'never', got }), ...expect.never },
  string: { any: fail({ expect: 'string', got }), ...expect.string },
  boolean: { any: fail({ expect: 'boolean', got }), ...expect.boolean },
  strartsWithHello: {
    any: fail({ expect: 'string', got }),
    ...expect.strartsWithHello,
  },
  endsWithWorld: {
    any: fail({ expect: 'string', got }),
    ...expect.endsWithWorld,
  },
  startsWithHelloEndsWithWorld: {
    any: fail({ expect: 'string', got }),
    ...expect.startsWithHelloEndsWithWorld,
  },
  number: { any: fail({ expect: 'number', got }), ...expect.number },
  integer: { any: fail({ expect: 'integer', got }), ...expect.integer },
  float: { any: fail({ expect: 'float', got }), ...expect.float },
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
    any: fail({ expect: 'array', got }),
    ...expect.tuple,
  },
  stringOrNumber: {
    any:
      expect.stringOrNumber?.any || fail({ expect: 'string .* number', got }),
    ...expect.stringOrNumber,
  },
  struct: {
    any: fail({ expect: 'object', got }),
    ...expect.struct,
  },
  enum: {
    any: fail({ got }),
    ...expect.enum,
  },
  dict: {
    any: fail({ expect: 'dictionary', got }),
    ...expect.dict,
  },
})

/** @type {Partial<Fixture>[]} */
export const source = [
  {
    in: 'hello',
    got: '"hello"',
    string: { any: pass() },
    unknown: { any: pass() },
    literal: { hello: { any: pass() } },
    stringOrNumber: { any: pass() },
    strartsWithHello: { any: fail.as(`expect .* "Hello" .* got "hello"`) },
    endsWithWorld: { any: fail.as(`expect .* "world" .* got "hello"`) },
    startsWithHelloEndsWithWorld: {
      any: fail.as(`expect .* "Hello" .* got "hello"`),
    },
  },
  {
    in: 'Green',
    got: '"Green"',
    string: { any: pass() },
    unknown: { any: pass() },
    stringOrNumber: { any: pass() },
    strartsWithHello: { any: fail.as(`expect .* "Hello" .* got "Green"`) },
    endsWithWorld: { any: fail.as(`expect .* "world" .* got "Green"`) },
    startsWithHelloEndsWithWorld: {
      any: fail.as(`expect .* "Hello" .* got "Green"`),
    },
    ['Red|Green|Blue']: {
      any: pass(),
    },
  },
  {
    in: 'Hello world',
    got: '"Hello world"',
    string: { any: pass() },
    unknown: { any: pass() },
    stringOrNumber: { any: pass() },
    strartsWithHello: { any: pass() },
    endsWithWorld: { any: pass() },
    startsWithHelloEndsWithWorld: {
      any: pass(),
    },
  },
  {
    in: new String('hello'),
    got: 'object',
    unknown: { any: pass() },
    point2d: {
      any: fail.at('"name"', { expect: '"Point2d"', got: 'undefined' }),
    },
    xyz: {
      any: fail.at('"x"', { expect: 'integer', got: 'undefined' }),
    },
    intDict: {
      any: fail.at('"0"', { expect: 'integer', got: '"h"' }),
    },
    pointDict: {
      any: fail.at('0', { expect: 'name|x|y', got: '"0"' }),
    },
    dict: { any: pass({ 0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o' }) },
  },
  {
    in: null,
    got: 'null',
    string: {
      nullable: pass(null),
    },
    boolean: {
      nullable: pass(null),
    },
    number: {
      nullable: pass(),
    },
    stringOrNumber: {
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
    stringOrNumber: {
      optional: pass(),
      default: value => pass(value),
    },
    integer: {
      optional: pass(),
      default: value => pass(value),
    },
    boolean: {
      optional: pass(),
      default: value => pass(value),
    },
    float: {
      optional: pass(),
      default: value => pass(value),
    },
    unknown: { any: pass(), default: value => pass(value) },
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
    stringOrNumber: { any: pass() },
    integer: { any: fail({ expect: 'integer', got: 'Infinity' }) },
    float: { any: fail({ expect: 'float', got: 'Infinity' }) },
    ['3 < n < 17']: { any: fail.as('Infinity < 17') },
    ['n < 100']: { any: fail.as('Infinity < 100') },
    unknown: { any: pass() },
  },
  {
    in: NaN,
    got: 'NaN',
    number: { any: pass() },
    ['3 < n < 17']: { any: fail.as('NaN > 3') },
    ['n < 100']: { any: fail.as('NaN < 100') },
    ['n > 100']: { any: fail.as('NaN > 100') },
    stringOrNumber: { any: pass() },
    integer: { any: fail({ expect: 'integer', got: 'NaN' }) },
    float: { any: fail({ expect: 'float', got: 'NaN' }) },
    unknown: { any: pass() },
  },
  {
    in: 101,
    number: { any: pass() },
    ['3 < n < 17']: { any: fail.as('101 < 17') },
    ['n < 100']: { any: fail.as('101 < 100') },
    ['n > 100']: { any: pass() },
    stringOrNumber: { any: pass() },
    integer: { any: pass() },
    float: { any: pass() },
    unknown: { any: pass() },
  },
  {
    in: 9.8,
    number: { any: pass() },
    ['3 < n < 17']: { any: pass() },
    ['n < 100']: { any: pass() },
    ['n > 100']: { any: fail.as('9.8 > 100') },
    stringOrNumber: { any: pass() },
    integer: { any: fail({ expect: 'integer', got: '9.8' }) },
    float: { any: pass() },
    unknown: { any: pass() },
  },
  {
    in: BigInt(1000),
    got: '1000n',
    unknown: { any: pass() },
  },
  {
    in: true,
    unknown: { any: pass() },
    boolean: { any: pass() },
  },
  {
    in: false,
    unknown: { any: pass() },
    boolean: { any: pass() },
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
    point2d: {
      any: fail.at('"name"', { expect: '"Point2d"', got: 'undefined' }),
    },
    xyz: {
      any: fail.at('"x"', { expect: 'integer', got: 'undefined' }),
    },
    dict: {
      any: pass(),
    },
  },
  {
    in: [],
    got: 'array',
    array: { any: pass() },
    unknown: { any: pass() },
    tuple: {
      any: fail.as('Array must contain exactly 2 elements'),
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
        any: fail.at(0, { got: 'undefined', expect: 'string' }),
      },
      strNfloat: {
        any: fail.at(0, { got: 'undefined', expect: 'string' }),
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
      any: fail.as('Array must contain exactly 2 elements'),
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
      any: fail.as('Array must contain exactly 2 elements'),
    },
  },
  {
    in: ['hello', 'world'],
    got: 'array',
    array: {
      any: fail.at(0, { got: '"hello"' }),
      string: { any: pass() },
    },
    unknown: { any: pass() },
    tuple: {
      strNfloat: {
        any: fail.at(1, { expect: 'float', got: '"world"' }),
      },
      strNstr: {
        any: pass(),
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
      any: fail.as('Array must contain exactly 2 elements'),
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
      strNfloat: {
        any: fail.at(1, { got: 'object', expect: 'float' }),
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
      any: fail.as('Array must contain exactly 2 elements'),
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
      strNfloat: {
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
      strNfloat: {
        any: fail.at(1, { got: 'function' }),
      },
    },
  },
  {
    in: { name: 'Point2d', x: 0, y: 0 },
    got: 'object',
    point2d: {
      any: pass(),
    },
    unknown: {
      any: pass(),
    },
    xyz: {
      any: fail.at('"z"', { expect: 'integer', got: 'undefined' }),
    },
    intDict: {
      any: fail.at('"name"', { expect: 'integer', got: '"Point2d"' }),
    },
    dict: {
      any: pass(),
    },
  },
  {
    in: { name: 'Point2d', x: 0, z: 0 },
    got: 'object',
    point2d: {
      any: fail.at('"y"', { expect: 'integer', got: 'undefined' }),
    },
    unknown: {
      any: pass(),
    },
    xyz: {
      any: fail.at('"y"', { expect: 'integer', got: 'undefined' }),
    },
    intDict: {
      any: fail.at('"name"', { expect: 'integer', got: '"Point2d"' }),
    },
    pointDict: {
      any: fail.at('z', { expect: 'name|x|y', got: '"z"' }),
    },
    dict: {
      any: pass(),
    },
  },
  {
    in: { name: 'Point2d', x: 0, y: 0.1 },
    got: 'object',
    point2d: {
      any: fail.at('"y"', { expect: 'integer', got: '0.1' }),
    },
    xyz: {
      any: fail.at('"y"', { expect: 'integer', got: '0.1' }),
    },
    unknown: {
      any: pass(),
    },
    intDict: {
      any: fail.at('"name"', { expect: 'integer', got: '"Point2d"' }),
    },
    dict: {
      any: pass(),
    },
  },
]

/**
 *
 * @param {Fixture} fixture
 * @returns {{schema: Schema.Schema, expect: Expect, skip?: boolean, only?:boolean}[]}
 */
export const scenarios = fixture => [
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
    schema: Schema.unknown().implicit('DEFAULT'),
    expect:
      (fixture.unknown.default && fixture.unknown.default('DEFAULT')) ||
      fixture.unknown.any ||
      fixture.any,
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
    schema: Schema.string().implicit('DEFAULT'),
    expect:
      (fixture.string.default && fixture.string.default('DEFAULT')) ||
      fixture.string.any ||
      fixture.any,
  },
  {
    schema: Schema.boolean(),
    expect: fixture.boolean.any || fixture.any,
  },
  {
    schema: Schema.boolean().optional(),
    expect: fixture.boolean.optional || fixture.boolean.any || fixture.any,
  },
  {
    schema: Schema.boolean().nullable(),
    expect: fixture.boolean.nullable || fixture.boolean.any || fixture.any,
  },
  {
    schema: Schema.boolean().default(false),
    expect:
      (fixture.boolean.default && fixture.boolean.default(false)) ||
      fixture.boolean.any ||
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
    schema: Schema.number().implicit(17),
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
    schema: Schema.integer().implicit(17),
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
    schema: Schema.string().array(),
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
    schema: Schema.array(Schema.string().implicit('DEFAULT')),
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
    schema: Schema.literal('hello').implicit('hello'),
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
    schema: Schema.tuple([Schema.string(), Schema.float()]),
    expect: fixture.tuple.strNfloat?.any || fixture.tuple.any || fixture.any,
  },
  {
    schema: Schema.string().or(Schema.number()),
    expect: fixture.stringOrNumber?.any || fixture.any,
  },
  {
    schema: Schema.string().or(Schema.number()),
    expect: fixture.stringOrNumber?.any || fixture.string.any || fixture.any,
  },
  {
    schema: Schema.string().or(Schema.number()).optional(),
    expect:
      fixture.stringOrNumber?.optional ||
      fixture.stringOrNumber?.any ||
      fixture.string.any ||
      fixture.any,
  },
  {
    schema: Schema.string().or(Schema.number()).nullable(),
    expect:
      fixture.stringOrNumber?.nullable ||
      fixture.stringOrNumber?.any ||
      fixture.string.any ||
      fixture.any,
  },
  {
    schema: Schema.string().or(Schema.number()).implicit(10),
    expect:
      (fixture.stringOrNumber?.default &&
        fixture.stringOrNumber?.default(10)) ||
      fixture.stringOrNumber?.any ||
      fixture.string.any ||
      fixture.any,
  },
  {
    schema: Schema.string().or(Schema.number()).implicit('test'),
    expect:
      (fixture.stringOrNumber?.default &&
        fixture.stringOrNumber?.default('test')) ||
      fixture.stringOrNumber?.any ||
      fixture.string.any ||
      fixture.any,
  },
  {
    schema: Schema.struct({
      name: 'Point2d',
      x: Schema.integer(),
      y: Schema.integer(),
    }),
    expect: fixture.point2d?.any || fixture.struct.any || fixture.any,
  },
  {
    schema: Schema.string().startsWith('Hello'),
    expect: fixture.strartsWithHello.any || fixture.string.any || fixture.any,
  },
  {
    schema: Schema.string().endsWith('world'),
    expect: fixture.endsWithWorld.any || fixture.string.any || fixture.any,
  },
  {
    schema: Schema.string().startsWith('Hello').endsWith('world'),
    expect:
      fixture.startsWithHelloEndsWithWorld.any ||
      fixture.string.any ||
      fixture.any,
  },
  {
    schema: Schema.number().greaterThan(100),
    expect: fixture['n > 100']?.any || fixture.number.any || fixture.any,
  },
  {
    schema: Schema.number().lessThan(100),
    expect: fixture['n < 100']?.any || fixture.number.any || fixture.any,
  },
  {
    schema: Schema.number().greaterThan(3).lessThan(17),
    expect: fixture['3 < n < 17']?.any || fixture.number.any || fixture.any,
  },
  {
    schema: Schema.enum(['Red', 'Green', 'Blue']),
    expect: fixture['Red|Green|Blue']?.any || fixture.enum.any || fixture.any,
  },
  {
    schema: Schema.struct({ x: Schema.integer() })
      .and(Schema.struct({ y: Schema.integer() }))
      .and(Schema.struct({ z: Schema.integer() })),
    expect: fixture.xyz?.any || fixture.struct.any || fixture.any,
  },
  {
    schema: Schema.dictionary({ value: Schema.integer() }),

    expect: fixture.intDict?.any || fixture.dict?.any || fixture.any,
  },

  {
    schema: Schema.dictionary({ value: unknown() }),
    expect: fixture.dict?.any || fixture.any,
  },

  {
    schema: Schema.dictionary({
      value: unknown(),
      key: Schema.enum(['name', 'x', 'y']),
    }),
    expect: fixture.pointDict?.any || fixture.dict.any || fixture.any,
  },
]

export default function* () {
  for (const each of source.map(fixture)) {
    for (const { skip, only, schema, expect } of scenarios(each)) {
      yield {
        skip: skip || each.skip,
        only: only || each.only,
        expect,
        schema,
        inputLabel: display(each.in),
        input: each.in,
      }
    }
  }
}

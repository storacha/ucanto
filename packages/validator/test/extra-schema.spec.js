import { URI, Link, Text, DID } from '../src/schema.js'
import { test, assert } from './test.js'
import * as API from '@ucanto/interface'

{
  /** @type {[string, {ok:string}|{error:{message:string}}][]} */
  const dataset = [
    ['', { error: { message: 'Invalid URI' } }],
    ['did:key:zAlice', { ok: 'did:key:zAlice' }],
    ['mailto:alice@mail.net', { ok: 'mailto:alice@mail.net' }],
  ]

  for (const [input, expect] of dataset) {
    test(`URI.read(${JSON.stringify(input)}}`, () => {
      assert.containSubset(URI.read(input), expect)
      assert.containSubset(URI.uri().read(input), expect)
    })
  }
}

test('URI.from', () => {
  /** @type {API.URI<`did:`>} */
  // @ts-expect-error - URI<"data:"> not assignable to URI<"did:">
  const data = URI.from('data:text/html,1')
  assert.equal(data, 'data:text/html,1')

  /** @type {API.URI<`did:`>} */
  const key = URI.from('did:key:zAlice')
  assert.equal(key, 'did:key:zAlice')
})

{
  /** @type {[unknown, `${string}:`, {ok:string}|{error:{message:string}}][]} */
  const dataset = [
    [
      undefined,
      'did:',
      { error: { message: 'Expected URI but got undefined' } },
    ],
    [null, 'did:', { error: { message: 'Expected URI but got null' } }],
    ['', 'did:', { error: { message: 'Invalid URI' } }],
    ['did:key:zAlice', 'did:', { ok: 'did:key:zAlice' }],
    [
      'did:key:zAlice',
      'mailto:',
      { error: { message: 'Expected mailto: URI instead got did:key:zAlice' } },
    ],
    ['mailto:alice@mail.net', 'mailto:', { ok: 'mailto:alice@mail.net' }],
    [
      'mailto:alice@mail.net',
      'did:',
      {
        error: {
          message: 'Expected did: URI instead got mailto:alice@mail.net',
        },
      },
    ],
  ]

  for (const [input, protocol, expect] of dataset) {
    test(`URI.match(${JSON.stringify({
      protocol,
    })}).read(${JSON.stringify(input)})}}`, () => {
      assert.containSubset(URI.match({ protocol }).read(input), expect)
    })
  }
}

{
  /** @type {[unknown, `${string}:`, {ok:string|undefined}|{error:{message:string}}][]} */
  const dataset = [
    [undefined, 'did:', { ok: undefined }],
    [null, 'did:', { error: { message: 'Expected URI but got null' } }],
    ['', 'did:', { error: { message: 'Invalid URI' } }],
    ['did:key:zAlice', 'did:', { ok: 'did:key:zAlice' }],
    [
      'did:key:zAlice',
      'mailto:',
      { error: { message: 'Expected mailto: URI instead got did:key:zAlice' } },
    ],
    ['mailto:alice@mail.net', 'mailto:', { ok: 'mailto:alice@mail.net' }],
    [
      'mailto:alice@mail.net',
      'did:',
      {
        error: {
          message: 'Expected did: URI instead got mailto:alice@mail.net',
        },
      },
    ],
  ]

  for (const [input, protocol, expect] of dataset) {
    test(`URI.match(${JSON.stringify({
      protocol,
    })}).optional().read(${JSON.stringify(input)})}}`, () => {
      assert.containSubset(
        URI.match({ protocol }).optional().read(input),
        expect
      )
    })
  }
}

{
  /** @type {unknown[][]} */
  const dataset = [
    [
      Link.parse('bafkqaaa'),
      null,
      { message: 'Expected link to be CID with 0x70 codec' },
      { message: 'Expected link to be CID with 0x12 hashing algorithm' },
      null,
      null,
    ],
    [
      Link.parse('QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB'),
      null,
      null,
      null,
      { message: 'Expected link to be CID version 1 instead of 0' },
      null,
    ],
    [
      Link.parse('bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny'),
      null,
      null,
      null,
      null,
      null,
    ],
    [
      {},
      ...Array(5).fill({
        message: 'Expected link to be a CID instead of [object Object]',
      }),
    ],
    [
      'QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB',
      ...Array(5).fill({
        message:
          'Expected link to be a CID instead of QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB',
      }),
    ],
    [
      null,
      ...Array(5).fill({ message: 'Expected link but got null instead' }),
      undefined,
    ],
    [
      undefined,
      ...Array(4).fill({ message: 'Expected link but got undefined instead' }),
      undefined,
    ],
  ]

  for (const [input, out1, out2, out3, out4, out5] of dataset) {
    test(`Link.read(${input})`, () => {
      assert.containSubset(
        Link.read(input),
        out1 ? { error: out1 } : { ok: input }
      )
    })

    test('Link.link()', () => {
      const schema = Link.link()
      assert.containSubset(
        schema.read(input),
        out1 ? { error: out1 } : { ok: input }
      )
    })

    test(`Link.match({ code: 0x70 }).read(${input})`, () => {
      const link = Link.match({ code: 0x70 })
      assert.containSubset(
        link.read(input),
        out2 ? { error: out2 } : { ok: input }
      )
    })

    test(`Link.match({ algorithm: 0x12 }).read(${input})`, () => {
      const link = Link.match({ multihash: { code: 0x12 } })
      assert.containSubset(
        link.read(input),
        out3 ? { error: out3 } : { ok: input }
      )
    })

    test(`Link.match({ version: 1 }).read(${input})`, () => {
      const link = Link.match({ version: 1 })
      assert.containSubset(
        link.read(input),
        out4 ? { error: out4 } : { ok: input }
      )
    })

    test(`Link.optional().read(${input})`, () => {
      const link = Link.optional()
      assert.containSubset(
        link.read(input),
        out5 ? { error: out5 } : { ok: input }
      )
    })
  }
}

{
  /** @type {unknown[][]} */
  const dataset = [
    [
      undefined,
      {
        error: {
          message: 'Expected value of type string instead got undefined',
        },
      },
    ],
    [
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    ['hello', { ok: 'hello' }],
    [
      new String('hello'),
      {
        error: { message: 'Expected value of type string instead got object' },
      },
    ],
  ]

  for (const [input, out] of dataset) {
    test(`Text.read(${input})`, () => {
      assert.containSubset(Text.read(input), out)
    })
  }
}

{
  /** @type {[{pattern:RegExp}, unknown, unknown][]} */
  const dataset = [
    [
      { pattern: /hello .*/ },
      undefined,
      {
        error: {
          message: 'Expected value of type string instead got undefined',
        },
      },
    ],
    [
      { pattern: /hello .*/ },
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    [
      { pattern: /hello .*/ },
      'hello',
      {
        error: {
          message: 'Expected to match /hello .*/ but got "hello" instead',
        },
      },
    ],
    [{ pattern: /hello .*/ }, 'hello world', { ok: 'hello world' }],
    [
      { pattern: /hello .*/ },
      new String('hello'),
      {
        error: { message: 'Expected value of type string instead got object' },
      },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).read(${input})`, () => {
      assert.containSubset(Text.match(options).read(input), out)
    })
  }
}

{
  /** @type {[{pattern?:RegExp}, unknown, unknown][]} */
  const dataset = [
    [{}, undefined, { ok: undefined }],
    [
      {},
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    [{}, 'hello', { ok: 'hello' }],
    [
      {},
      new String('hello'),
      {
        error: { message: 'Expected value of type string instead got object' },
      },
    ],

    [{ pattern: /hello .*/ }, undefined, { ok: undefined }],
    [
      { pattern: /hello .*/ },
      null,
      {
        error: {
          message: 'Expected value of type string instead got null',
        },
      },
    ],
    [
      { pattern: /hello .*/ },
      'hello',
      {
        error: {
          message: 'Expected to match /hello .*/ but got "hello" instead',
        },
      },
    ],
    [{ pattern: /hello .*/ }, 'hello world', { ok: 'hello world' }],
    [
      { pattern: /hello .*/ },
      new String('hello'),
      {
        error: {
          message: 'Expected value of type string instead got object',
        },
      },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).read(${input})`, () => {
      const schema = options.pattern
        ? Text.match({ pattern: options.pattern })
        : Text.text()
      assert.containSubset(schema.optional().read(input), out)
    })
  }
}

{
  /** @type {unknown[][]} */
  const dataset = [
    [
      undefined,
      {
        error: {
          message: 'Expected value of type string instead got undefined',
        },
      },
    ],
    [
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    [
      'hello',
      { error: { message: 'Expected a did: but got "hello" instead' } },
    ],
    [
      new String('hello'),
      {
        error: {
          message: 'Expected value of type string instead got object',
        },
      },
    ],
    ['did:echo:1', { ok: 'did:echo:1' }],
  ]

  for (const [input, out] of dataset) {
    test(`DID.read(${input})`, () => {
      assert.containSubset(DID.read(input), out)
    })
  }
}

{
  /** @type {[{method:string}, unknown, unknown][]} */
  const dataset = [
    [
      { method: 'echo' },
      undefined,
      {
        error: {
          message: 'Expected value of type string instead got undefined',
        },
      },
    ],
    [
      { method: 'echo' },
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    [
      { method: 'echo' },
      'hello',
      { error: { message: 'Expected a did:echo: but got "hello" instead' } },
    ],
    [{ method: 'echo' }, 'did:echo:hello', { ok: 'did:echo:hello' }],
    [
      { method: 'foo' },
      'did:echo:hello',
      {
        error: {
          message: 'Expected a did:foo: but got "did:echo:hello" instead',
        },
      },
    ],
    [
      { method: 'echo' },
      new String('hello'),
      {
        error: { message: 'Expected value of type string instead got object' },
      },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.match({ method: ${options.method} }).read(${input})`, () => {
      assert.containSubset(DID.match(options).read(input), out)
    })
  }
}

{
  /** @type {[{method?:string}, unknown, unknown][]} */
  const dataset = [
    [{}, undefined, { ok: undefined }],
    [
      {},
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    [{}, 'did:echo:bar', { ok: 'did:echo:bar' }],
    [
      {},
      new String('hello'),
      {
        error: { message: 'Expected value of type string instead got object' },
      },
    ],

    [{ method: 'echo' }, undefined, { ok: undefined }],
    [
      { method: 'echo' },
      null,
      { error: { message: 'Expected value of type string instead got null' } },
    ],
    [
      { method: 'echo' },
      'did:hello:world',
      {
        error: {
          message: 'Expected a did:echo: but got "did:hello:world" instead',
        },
      },
    ],
    [
      { method: 'echo' },
      'hello world',
      {
        error: {
          message: 'Expected a did:echo: but got "hello world" instead',
        },
      },
    ],
    [
      { method: 'echo' },
      new String('hello'),
      {
        error: { message: 'Expected value of type string instead got object' },
      },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.match({ method: "${options.method}" }).optional().read(${input})`, () => {
      const schema = options.method ? DID.match(options) : DID.did()
      assert.containSubset(schema.optional().read(input), out)
    })
  }
}

{
  /** @type {Array<[unknown, null|{ name: string, message: string }]>} */
  const dataset = [
    ['did:key:foo', null],
    ['did:web:example.com', null],
    ['did:twosegments', null],
    [
      'notdid',
      {
        name: 'SchemaError',
        message: 'Expected a did: but got "notdid" instead',
      },
    ],
    [
      undefined,
      {
        name: 'TypeError',
        message: 'Expected value of type string instead got undefined',
      },
    ],
  ]
  for (const [did, errorExpectation] of dataset) {
    test(`DID.from("${did}")`, () => {
      let error
      try {
        DID.from(did)
      } catch (_error) {
        error = _error
      }
      if (errorExpectation) {
        assert.containSubset(error, errorExpectation)
      } else {
        assert.notOk(error, 'expected no error, but got an error')
      }
    })
  }
}

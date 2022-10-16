import { URI, Link, Text, DID } from '../src/schema.js'
import { test, assert } from './test.js'
import * as API from '@ucanto/interface'

{
  /** @type {[string, string|{message:string}][]} */
  const dataset = [
    ['', { message: 'Invalid URI' }],
    ['did:key:zAlice', 'did:key:zAlice'],
    ['mailto:alice@mail.net', 'mailto:alice@mail.net'],
  ]

  for (const [input, expect] of dataset) {
    test(`URI.decode(${JSON.stringify(input)}}`, () => {
      assert.deepNestedInclude(URI.read(input), expect)
      assert.deepNestedInclude(URI.uri().read(input), expect)
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
  /** @type {[unknown, `${string}:`, {message:string}|string][]} */
  const dataset = [
    [undefined, 'did:', { message: 'Expected URI but got undefined' }],
    [null, 'did:', { message: 'Expected URI but got null' }],
    ['', 'did:', { message: 'Invalid URI' }],
    ['did:key:zAlice', 'did:', 'did:key:zAlice'],
    [
      'did:key:zAlice',
      'mailto:',
      { message: 'Expected mailto: URI instead got did:key:zAlice' },
    ],
    ['mailto:alice@mail.net', 'mailto:', 'mailto:alice@mail.net'],
    [
      'mailto:alice@mail.net',
      'did:',
      { message: 'Expected did: URI instead got mailto:alice@mail.net' },
    ],
  ]

  for (const [input, protocol, expect] of dataset) {
    test(`URI.match(${JSON.stringify({
      protocol,
    })}).decode(${JSON.stringify(input)})}}`, () => {
      assert.deepNestedInclude(URI.match({ protocol }).read(input), expect)
    })
  }
}

{
  /** @type {[unknown, `${string}:`, {message:string}|string|undefined][]} */
  const dataset = [
    [undefined, 'did:', undefined],
    [null, 'did:', { message: 'Expected URI but got null' }],
    ['', 'did:', { message: 'Invalid URI' }],
    ['did:key:zAlice', 'did:', 'did:key:zAlice'],
    [
      'did:key:zAlice',
      'mailto:',
      { message: 'Expected mailto: URI instead got did:key:zAlice' },
    ],
    ['mailto:alice@mail.net', 'mailto:', 'mailto:alice@mail.net'],
    [
      'mailto:alice@mail.net',
      'did:',
      { message: 'Expected did: URI instead got mailto:alice@mail.net' },
    ],
  ]

  for (const [input, protocol, expect] of dataset) {
    test(`URI.match(${JSON.stringify({
      protocol,
    })}).optional().decode(${JSON.stringify(input)})}}`, () => {
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
      assert.deepNestedInclude(Link.read(input), out1 || input)
    })

    test('Link.link()', () => {
      const schema = Link.link()
      assert.containSubset(schema.read(input), out1 || input)
    })

    test(`Link.match({ code: 0x70 }).read(${input})`, () => {
      const link = Link.match({ code: 0x70 })
      assert.deepNestedInclude(link.read(input), out2 || input)
    })

    test(`Link.match({ algorithm: 0x12 }).read(${input})`, () => {
      const link = Link.match({ algorithm: 0x12 })
      assert.deepNestedInclude(link.read(input), out3 || input)
    })

    test(`Link.match({ version: 1 }).read(${input})`, () => {
      const link = Link.match({ version: 1 })
      assert.deepNestedInclude(link.read(input), out4 || input)
    })

    test(`Link.optional().read(${input})`, () => {
      const link = Link.optional()
      assert.containSubset(link.read(input), out5 || input)
    })
  }
}

{
  /** @type {unknown[][]} */
  const dataset = [
    [
      undefined,
      { message: 'Expected value of type string instead got undefined' },
    ],
    [null, { message: 'Expected value of type string instead got null' }],
    ['hello', 'hello'],
    [
      new String('hello'),
      { message: 'Expected value of type string instead got object' },
    ],
  ]

  for (const [input, out] of dataset) {
    test(`Text.read(${input})`, () => {
      assert.deepNestedInclude(Text.read(input), out)
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
        message: 'Expected value of type string instead got undefined',
      },
    ],
    [
      { pattern: /hello .*/ },
      null,
      { message: 'Expected value of type string instead got null' },
    ],
    [
      { pattern: /hello .*/ },
      'hello',
      { message: 'Expected to match /hello .*/ but got "hello" instead' },
    ],
    [{ pattern: /hello .*/ }, 'hello world', 'hello world'],
    [
      { pattern: /hello .*/ },
      new String('hello'),
      { message: 'Expected value of type string instead got object' },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).read(${input})`, () => {
      assert.deepNestedInclude(Text.match(options).read(input), out)
    })
  }
}

{
  /** @type {[{pattern?:RegExp}, unknown, unknown][]} */
  const dataset = [
    [{}, undefined, undefined],
    [{}, null, { message: 'Expected value of type string instead got null' }],
    [{}, 'hello', 'hello'],
    [
      {},
      new String('hello'),
      { message: 'Expected value of type string instead got object' },
    ],

    [{ pattern: /hello .*/ }, undefined, undefined],
    [
      { pattern: /hello .*/ },
      null,
      {
        message: 'Expected value of type string instead got null',
      },
    ],
    [
      { pattern: /hello .*/ },
      'hello',
      { message: 'Expected to match /hello .*/ but got "hello" instead' },
    ],
    [{ pattern: /hello .*/ }, 'hello world', 'hello world'],
    [
      { pattern: /hello .*/ },
      new String('hello'),
      {
        message: 'Expected value of type string instead got object',
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
      { message: 'Expected value of type string instead got undefined' },
    ],
    [null, { message: 'Expected value of type string instead got null' }],
    ['hello', { message: 'Expected a did: but got "hello" instead' }],
    [
      new String('hello'),
      {
        message: 'Expected value of type string instead got object',
      },
    ],
    ['did:echo:1', 'did:echo:1'],
  ]

  for (const [input, out] of dataset) {
    test(`DID.decode(${input})`, () => {
      assert.deepNestedInclude(DID.read(input), out)
    })
  }
}

{
  /** @type {[{method:string}, unknown, unknown][]} */
  const dataset = [
    [
      { method: 'echo' },
      undefined,
      { message: 'Expected value of type string instead got undefined' },
    ],
    [
      { method: 'echo' },
      null,
      { message: 'Expected value of type string instead got null' },
    ],
    [
      { method: 'echo' },
      'hello',
      { message: 'Expected a did:echo: but got "hello" instead' },
    ],
    [{ method: 'echo' }, 'did:echo:hello', 'did:echo:hello'],
    [
      { method: 'foo' },
      'did:echo:hello',
      { message: 'Expected a did:foo: but got "did:echo:hello" instead' },
    ],
    [
      { method: 'echo' },
      new String('hello'),
      { message: 'Expected value of type string instead got object' },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.match({ method: ${options.method} }).decode(${input})`, () => {
      assert.deepNestedInclude(DID.match(options).read(input), out)
    })
  }
}

{
  /** @type {[{method?:string}, unknown, unknown][]} */
  const dataset = [
    [{}, undefined, undefined],
    [{}, null, { message: 'Expected value of type string instead got null' }],
    [{}, 'did:echo:bar', 'did:echo:bar'],
    [
      {},
      new String('hello'),
      { message: 'Expected value of type string instead got object' },
    ],

    [{ method: 'echo' }, undefined, undefined],
    [
      { method: 'echo' },
      null,
      { message: 'Expected value of type string instead got null' },
    ],
    [
      { method: 'echo' },
      'did:hello:world',
      { message: 'Expected a did:echo: but got "did:hello:world" instead' },
    ],
    [
      { method: 'echo' },
      'hello world',
      { message: 'Expected a did:echo: but got "hello world" instead' },
    ],
    [
      { method: 'echo' },
      new String('hello'),
      { message: 'Expected value of type string instead got object' },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.match({ method: "${options.method}" }).optional().decode(${input})`, () => {
      const schema = options.method ? DID.match(options) : DID.did()
      assert.containSubset(schema.optional().read(input), out)
    })
  }
}

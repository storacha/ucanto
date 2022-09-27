import { URI, Link, Text } from '../src/lib.js'
import { test, assert } from './test.js'
import { CID } from 'multiformats'

{
  /** @type {[string, string|{message:string}][]} */
  const dataset = [
    ['', { message: 'Invalid URI' }],
    ['did:key:zAlice', 'did:key:zAlice'],
    ['mailto:alice@mail.net', 'mailto:alice@mail.net'],
  ]

  for (const [input, expect] of dataset) {
    test(`URI.decode(${JSON.stringify(input)}}`, () => {
      assert.containSubset(URI.decode(input), expect)
    })
  }
}

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
      assert.containSubset(URI.match({ protocol }).decode(input), expect)
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
    test(`URI.optional(${JSON.stringify({
      protocol,
    })}).decode(${JSON.stringify(input)})}}`, () => {
      assert.containSubset(URI.optional({ protocol }).decode(input), expect)
    })
  }
}

{
  /** @type {unknown[][]} */
  const dataset = [
    [
      CID.parse('bafkqaaa'),
      null,
      { message: 'Expected link to be CID with 0x70 codec' },
      { message: 'Expected link to be CID with 0x12 hashing algorithm' },
      null,
      null,
    ],
    [
      CID.parse('QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB'),
      null,
      null,
      null,
      { message: 'Expected link to be CID version 1 instead of 0' },
      null,
    ],
    [
      CID.parse('bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny'),
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
    test(`Link.decode(${input})`, () => {
      assert.containSubset(Link.decode(input), out1 || input)
    })

    test(`Link.match({ code: 0x70 }).decode(${input})`, () => {
      const link = Link.match({ code: 0x70 })
      assert.containSubset(link.decode(input), out2 || input)
    })

    test(`Link.match({ algorithm: 0x12 }).decode(${input})`, () => {
      const link = Link.match({ algorithm: 0x12 })
      assert.containSubset(link.decode(input), out3 || input)
    })

    test(`Link.match({ version: 1 }).decode(${input})`, () => {
      const link = Link.match({ version: 1 })
      assert.containSubset(link.decode(input), out4 || input)
    })

    test(`Link.optional().decode(${input})`, () => {
      const link = Link.optional()
      assert.containSubset(link.decode(input), out5 || input)
    })
  }
}

{
  /** @type {unknown[][]} */
  const dataset = [
    [undefined, { message: 'Expected a string but got undefined instead' }],
    [null, { message: 'Expected a string but got null instead' }],
    ['hello', 'hello'],
    [
      new String('hello'),
      { message: 'Expected a string but got object instead' },
    ],
  ]

  for (const [input, out] of dataset) {
    test(`Text.decode(${input})`, () => {
      assert.containSubset(Text.decode(input), out)
    })
  }
}

{
  /** @type {[{pattern:RegExp}, unknown, unknown][]} */
  const dataset = [
    [
      { pattern: /hello .*/ },
      undefined,
      { message: 'Expected a string but got undefined instead' },
    ],
    [
      { pattern: /hello .*/ },
      null,
      { message: 'Expected a string but got null instead' },
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
      { message: 'Expected a string but got object instead' },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).decode(${input})`, () => {
      assert.containSubset(Text.match(options).decode(input), out)
    })
  }
}

{
  /** @type {[{pattern?:RegExp}, unknown, unknown][]} */
  const dataset = [
    [{}, undefined, undefined],
    [{}, null, { message: 'Expected a string but got null instead' }],
    [{}, 'hello', 'hello'],
    [
      {},
      new String('hello'),
      { message: 'Expected a string but got object instead' },
    ],

    [{ pattern: /hello .*/ }, undefined, undefined],
    [
      { pattern: /hello .*/ },
      null,
      { message: 'Expected a string but got null instead' },
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
      { message: 'Expected a string but got object instead' },
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).decode(${input})`, () => {
      assert.containSubset(Text.optional(options).decode(input), out)
    })
  }
}

import { URI, Text, DID } from '../src/schema.js'
import { parseLink } from '../src/lib.js'
import * as Schema from '../src/schema.js'
import { test, assert, matchResult } from './test.js'
import * as API from '@ucanto/interface'
import { sha256 } from '../src/dag.js'

{
  /** @type {[string, API.Result|RegExp][]} */
  const dataset = [
    ['', /Invalid URI/],
    ['did:key:zAlice', { ok: 'did:key:zAlice' }],
    ['mailto:alice@mail.net', { ok: 'mailto:alice@mail.net' }],
  ]

  for (const [input, expect] of dataset) {
    test(`URI.read(${JSON.stringify(input)}}`, () => {
      matchResult(URI.read(input), expect)
      matchResult(URI.uri().tryFrom(input), expect)
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
  /** @type {[unknown, `${string}:`, API.Result|RegExp][]} */
  const dataset = [
    [undefined, 'did:', /Expected URI but got undefined/],
    [null, 'did:', /Expected URI but got null/],
    ['', 'did:', /Invalid URI/],
    ['did:key:zAlice', 'did:', { ok: 'did:key:zAlice' }],
    [
      'did:key:zAlice',
      'mailto:',
      /Expected mailto: URI instead got did:key:zAlice/,
    ],
    ['mailto:alice@mail.net', 'mailto:', { ok: 'mailto:alice@mail.net' }],
    [
      'mailto:alice@mail.net',
      'did:',
      /Expected did: URI instead got mailto:alice@mail.net/,
    ],
  ]

  for (const [input, protocol, expect] of dataset) {
    test(`URI.match(${JSON.stringify({
      protocol,
    })}).read(${JSON.stringify(input)})}}`, () => {
      matchResult(URI.match({ protocol }).tryFrom(input), expect)
    })
  }
}

{
  /** @type {[unknown, `${string}:`, API.Result|RegExp][]} */
  const dataset = [
    [undefined, 'did:', { ok: undefined }],
    [null, 'did:', /Expected URI but got null/],
    ['', 'did:', /Invalid URI/],
    ['did:key:zAlice', 'did:', { ok: 'did:key:zAlice' }],
    [
      'did:key:zAlice',
      'mailto:',
      /Expected mailto: URI instead got did:key:zAlice/,
    ],
    ['mailto:alice@mail.net', 'mailto:', { ok: 'mailto:alice@mail.net' }],
    [
      'mailto:alice@mail.net',
      'did:',
      /Expected did: URI instead got mailto:alice@mail.net/,
    ],
  ]

  for (const [input, protocol, expect] of dataset) {
    test(`URI.match(${JSON.stringify({
      protocol,
    })}).optional().read(${JSON.stringify(input)})}}`, () => {
      matchResult(URI.match({ protocol }).optional().tryFrom(input), expect)
    })
  }
}

{
  /** @type {any[][]} */
  const dataset = [
    [
      parseLink('bafkqaaa'),
      null,
      /Expected link to be CID with 0x70 codec/,
      /Expected link to be CID with 0x12 hashing algorithm/,
      null,
      null,
    ],
    [
      parseLink('QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB'),
      null,
      null,
      null,
      /Expected link to be CID version 1 instead of 0/,
      null,
    ],
    [
      parseLink('bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny'),
      null,
      null,
      null,
      null,
      null,
    ],
    [
      {},
      ...Array(5).fill(
        /Expected link to be a CID instead of \[object Object\]/
      ),
    ],
    [
      'QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB',
      ...Array(5).fill(
        /Expected link to be a CID instead of QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB/
      ),
    ],
    [null, ...Array(5).fill(/Expected link but got null instead/), undefined],
    [
      undefined,
      ...Array(4).fill(/Expected link but got undefined instead/),
      undefined,
    ],
  ]

  for (const [input, out1, out2, out3, out4, out5] of dataset) {
    test(`unknown().link().tryFrom(${input})`, () => {
      matchResult(Schema.unknown().link().tryFrom(input), out1 || { ok: input })
    })

    test('Schema.link()', () => {
      const schema = Schema.unknown().link()
      matchResult(schema.tryFrom(input), out1 || { ok: input })
    })

    test(`Schema.link({ code: 0x70 }).read(${input})`, () => {
      const link = Schema.unknown().link({ codec: { code: 0x70 } })
      matchResult(link.tryFrom(input), out2 || { ok: input })
    })

    test(`Schema.link({ algorithm: 0x12 }).read(${input})`, () => {
      const link = Schema.unknown().link({ hasher: sha256 })
      matchResult(link.tryFrom(input), out3 || { ok: input })
    })

    test(`Schema.link({ version: 1 }).read(${input})`, () => {
      const link = Schema.unknown().link({ version: 1 })
      matchResult(link.tryFrom(input), out4 || { ok: input })
    })

    test(`Link.optional().read(${input})`, () => {
      const link = Schema.unknown().link().optional()
      matchResult(link.tryFrom(input), out5 || { ok: input })
    })
  }
}

{
  /** @type {any[][]} */
  const dataset = [
    [undefined, /Expected value of type string instead got undefined/],
    [null, /Expected value of type string instead got null/],
    ['hello', { ok: 'hello' }],
    [new String('hello'), /Expected value of type string instead got object/],
  ]

  for (const [input, out] of dataset) {
    test(`Text.read(${input})`, () => {
      matchResult(Text.read(input), out)
    })
  }
}

{
  /** @type {[{pattern:RegExp}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [
      { pattern: /hello .*/ },
      undefined,
      /Expected value of type string instead got undefined/,
    ],
    [
      { pattern: /hello .*/ },
      null,
      /Expected value of type string instead got null/,
    ],
    [
      { pattern: /hello .*/ },
      'hello',
      /Expected to match \/hello \.\*\/ but got "hello" instead/,
    ],
    [{ pattern: /hello .*/ }, 'hello world', { ok: 'hello world' }],
    [
      { pattern: /hello .*/ },
      new String('hello'),
      /Expected value of type string instead got object/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).read(${input})`, () => {
      matchResult(Text.match(options).read(input), out)
    })
  }
}

{
  /** @type {[{pattern?:RegExp}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [{}, undefined, { ok: undefined }],
    [{}, null, /Expected value of type string instead got null/],
    [{}, 'hello', { ok: 'hello' }],
    [
      {},
      new String('hello'),
      /Expected value of type string instead got object/,
    ],

    [{ pattern: /hello .*/ }, undefined, { ok: undefined }],
    [
      { pattern: /hello .*/ },
      null,
      /Expected value of type string instead got null/,
    ],
    [
      { pattern: /hello .*/ },
      'hello',
      /Expected to match \/hello \.\*\/ but got "hello" instead/,
    ],
    [{ pattern: /hello .*/ }, 'hello world', { ok: 'hello world' }],
    [
      { pattern: /hello .*/ },
      new String('hello'),
      /Expected value of type string instead got object/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Text.match({ pattern: ${options.pattern} }).read(${input})`, () => {
      const schema = options.pattern
        ? Text.match({ pattern: options.pattern })
        : Text.text()
      matchResult(schema.optional().read(input), out)
    })
  }
}

{
  /** @type {any[][]} */
  const dataset = [
    [undefined, /Expected value of type string instead got undefined/],
    [null, /Expected value of type string instead got null/],
    ['hello', /Expected a did: but got "hello" instead/],
    [new String('hello'), /Expected value of type string instead got object/],
    ['did:echo:1', { ok: 'did:echo:1' }],
  ]

  for (const [input, out] of dataset) {
    test(`DID.read(${input})`, () => {
      matchResult(DID.read(input), out)
    })
  }
}

{
  /** @type {[{method:string}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [
      { method: 'echo' },
      undefined,
      /Expected value of type string instead got undefined/,
    ],
    [
      { method: 'echo' },
      null,
      /Expected value of type string instead got null/,
    ],
    [
      { method: 'echo' },
      'hello',
      /Expected a did:echo: but got "hello" instead/,
    ],
    [{ method: 'echo' }, 'did:echo:hello', { ok: 'did:echo:hello' }],
    [
      { method: 'foo' },
      'did:echo:hello',
      /Expected a did:foo: but got "did:echo:hello" instead/,
    ],
    [
      { method: 'echo' },
      new String('hello'),
      /Expected value of type string instead got object/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.match({ method: ${options.method} }).read(${input})`, () => {
      matchResult(DID.match(options).tryFrom(input), out)
    })
  }
}

{
  /** @type {[{method?:string}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [{}, undefined, { ok: undefined }],
    [{}, null, /Expected value of type string instead got null/],
    [{}, 'did:echo:bar', { ok: 'did:echo:bar' }],
    [
      {},
      new String('hello'),
      /Expected value of type string instead got object/,
    ],

    [{ method: 'echo' }, undefined, { ok: undefined }],
    [
      { method: 'echo' },
      null,
      /Expected value of type string instead got null/,
    ],
    [
      { method: 'echo' },
      'did:hello:world',
      /Expected a did:echo: but got "did:hello:world" instead/,
    ],
    [
      { method: 'echo' },
      'hello world',
      /Expected a did:echo: but got "hello world" instead/,
    ],
    [
      { method: 'echo' },
      new String('hello'),
      /Expected value of type string instead got object/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.match({ method: "${options.method}" }).optional().read(${input})`, () => {
      const schema = options.method ? DID.match(options) : DID.did()
      matchResult(schema.optional().tryFrom(input), out)
    })
  }
}

{
  /** @type {Array<[unknown, null|RegExp]>} */
  const dataset = [
    ['did:key:foo', null],
    ['did:web:example.com', null],
    ['did:twosegments', null],
    ['notdid', /SchemaError: Expected a did: but got "notdid" instead/],
    [
      undefined,
      /TypeError: Expected value of type string instead got undefined/,
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
        assert.match(String(error), errorExpectation)
      } else {
        assert.notOk(error, 'expected no error, but got an error')
      }
    })
  }
}

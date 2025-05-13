import { URI, Link, Text, DID, Principal } from '../src/schema.js'
import { test, assert, matchResult } from './test.js'
import * as API from '@ucanto/interface'
import * as DIDTools from '@ipld/dag-ucan/did'

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
      matchResult(URI.uri().read(input), expect)
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
      matchResult(URI.match({ protocol }).read(input), expect)
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
      matchResult(URI.match({ protocol }).optional().read(input), expect)
    })
  }
}

{
  /** @type {any[][]} */
  const dataset = [
    [
      Link.parse('bafkqaaa'),
      null,
      /Expected link to be CID with 0x70 codec/,
      /Expected link to be CID with 0x12 hashing algorithm/,
      null,
      null,
    ],
    [
      Link.parse('QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB'),
      null,
      null,
      null,
      /Expected link to be CID version 1 instead of 0/,
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
    test(`Link.read(${input})`, () => {
      matchResult(Link.read(input), out1 || { ok: input })
    })

    test('Link.link()', () => {
      const schema = Link.link()
      matchResult(schema.read(input), out1 || { ok: input })
    })

    test(`Link.match({ code: 0x70 }).read(${input})`, () => {
      const link = Link.match({ code: 0x70 })
      matchResult(link.read(input), out2 || { ok: input })
    })

    test(`Link.match({ algorithm: 0x12 }).read(${input})`, () => {
      const link = Link.match({ multihash: { code: 0x12 } })
      matchResult(link.read(input), out3 || { ok: input })
    })

    test(`Link.match({ version: 1 }).read(${input})`, () => {
      const link = Link.match({ version: 1 })
      matchResult(link.read(input), out4 || { ok: input })
    })

    test(`Link.optional().read(${input})`, () => {
      const link = Link.optional()
      matchResult(link.read(input), out5 || { ok: input })
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
      matchResult(DID.match(options).read(input), out)
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
      matchResult(schema.optional().read(input), out)
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

{
  /** @type {any[][]} */
  const dataset = [
    [undefined, /Expected value of type Uint8Array instead got undefined/],
    [null, /Expected value of type Uint8Array instead got null/],
    [Uint8Array.from([1, 2, 3]), /Unable to parse bytes as did:/],
    [DIDTools.parse('did:echo:1'), { ok: 'did:echo:1' }],
  ]

  for (const [input, out] of dataset) {
    test(`DID.readBytes(${input})`, () => {
      matchResult(DID.readBytes(input), out)
    })
  }
}

{
  /** @type {[{method:string}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [
      { method: 'echo' },
      undefined,
      /Expected value of type Uint8Array instead got undefined/,
    ],
    [
      { method: 'echo' },
      null,
      /Expected value of type Uint8Array instead got null/,
    ],
    [
      { method: 'echo' },
      Uint8Array.from([1, 2, 3]),
      /Unable to parse bytes as did:/,
    ],
    [{ method: 'echo' }, DIDTools.parse('did:echo:hello'), { ok: 'did:echo:hello' }],
    [
      { method: 'foo' },
      DIDTools.parse('did:echo:hello'),
      /Expected a did:foo: but got "did:echo:hello" instead/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.matchBytes({ method: ${options.method} }).read(${input})`, () => {
      matchResult(DID.matchBytes(options).read(input), out)
    })
  }
}

{
  /** @type {[{method?:string}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [{}, undefined, { ok: undefined }],
    [{}, null, /Expected value of type Uint8Array instead got null/],
    [{}, DIDTools.parse('did:echo:bar'), { ok: 'did:echo:bar' }],
    [{ method: 'echo' }, undefined, { ok: undefined }],
    [
      { method: 'echo' },
      null,
      /Expected value of type Uint8Array instead got null/,
    ],
    [
      { method: 'echo' },
      DIDTools.parse('did:hello:world'),
      /Expected a did:echo: but got "did:hello:world" instead/,
    ],
    [
      { method: 'echo' },
      Uint8Array.from([1, 2, 3]),
      /Unable to parse bytes as did:/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`DID.matchBytes({ method: "${options.method}" }).optional().read(${input})`, () => {
      const schema = options.method ? DID.matchBytes(options) : DID.didBytes()
      matchResult(schema.optional().read(input), out)
    })
  }
}

{
  /** @type {Array<[unknown, null|RegExp]>} */
  const dataset = [
    [DIDTools.parse('did:foo:bar'), null],
    [DIDTools.parse('did:web:example.com'), null],
    [DIDTools.parse('did:twosegments'), null],
    [Uint8Array.from([1, 2, 3]), /Unable to parse bytes as did:/],
    [
      undefined,
      /TypeError: Expected value of type Uint8Array instead got undefined/,
    ],
  ]
  for (const [did, errorExpectation] of dataset) {
    test(`DID.fromBytes("${did}")`, () => {
      let error
      try {
        DID.fromBytes(did)
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

{
  /** @type {any[][]} */
  const dataset = [
    [undefined, /Expected value of type Uint8Array instead got undefined/],
    [null, /Expected value of type Uint8Array instead got null/],
    [Uint8Array.from([1, 2, 3]), /Unable to decode bytes as DID:/],
    [DIDTools.parse('did:echo:1'), { ok: new Uint8Array([157, 26, 101, 99, 104, 111, 58, 49]) }],
  ]

  for (const [input, out] of dataset) {
    test(`Principal.read(${input == null ? input : `Uint8Array([${input}])`})`, () => {
      matchResult(Principal.read(input), out)
    })
  }
}

{
  /** @type {[{method:string}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [
      { method: 'echo' },
      undefined,
      /Expected value of type Uint8Array instead got undefined/,
    ],
    [
      { method: 'echo' },
      null,
      /Expected value of type Uint8Array instead got null/,
    ],
    [
      { method: 'echo' },
      Uint8Array.from([1, 2, 3]),
      /Unable to decode bytes as DID:/,
    ],
    [
      { method: 'echo' },
      DIDTools.parse('did:echo:hello'),
      { ok: new Uint8Array([157, 26, 101, 99, 104, 111, 58, 104, 101, 108, 108, 111]) }
    ],
    [
      { method: 'foo' },
      DIDTools.parse('did:echo:hello'),
      /Expected a did:foo: but got "did:echo:hello" instead/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Principal.match({ method: ${options.method == null ? options.method : `"${options.method}"`} }).read(${input == null ? input : `Uint8Array([${input}])`})`, () => {
      matchResult(Principal.match(options).read(input), out)
    })
  }
}

{
  /** @type {[{method?:string}, unknown, API.Result|RegExp][]} */
  const dataset = [
    [{}, undefined, { ok: undefined }],
    [{}, null, /Expected value of type Uint8Array instead got null/],
    [
      {},
      DIDTools.parse('did:echo:bar'),
      { ok: new Uint8Array([157, 26, 101, 99, 104, 111, 58, 98, 97, 114]) }
    ],
    [{ method: 'echo' }, undefined, { ok: undefined }],
    [
      { method: 'echo' },
      null,
      /Expected value of type Uint8Array instead got null/,
    ],
    [
      { method: 'echo' },
      DIDTools.parse('did:hello:world'),
      /Expected a did:echo: but got "did:hello:world" instead/,
    ],
    [
      { method: 'echo' },
      Uint8Array.from([1, 2, 3]),
      /Unable to decode bytes as DID:/,
    ],
  ]

  for (const [options, input, out] of dataset) {
    test(`Principal.match({ method: ${options.method == null ? options.method : `"${options.method}"`} }).optional().read(${input == null ? input : `Uint8Array([${input}])`})`, () => {
      const schema = options.method ? Principal.match(options) : Principal.principal()
      matchResult(schema.optional().read(input), out)
    })
  }
}

{
  /** @type {Array<[unknown, null|RegExp]>} */
  const dataset = [
    [DIDTools.parse('did:foo:bar'), null],
    [DIDTools.parse('did:web:example.com'), null],
    [DIDTools.parse('did:twosegments'), null],
    [Uint8Array.from([1, 2, 3]), /Unable to decode bytes as DID:/],
    [
      undefined,
      /TypeError: Expected value of type Uint8Array instead got undefined/,
    ],
  ]
  for (const [did, errorExpectation] of dataset) {
    test(`Principal.from(${did == null ? did : `Uint8Array([${did}])`})`, () => {
      let error
      try {
        Principal.from(did)
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

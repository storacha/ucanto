import * as Schema from '../src/schema.js'
import { base36 } from 'multiformats/bases/base36'
import { test, assert, matchError } from './test.js'
import { CBOR, sha256 } from '../src/dag.js'

const fixtures = {
  pb: Schema.unknown()
    .link()
    .parse('QmTgnQBKj7eTV7ohraBCmh1DLwerUd2X9Rxzgf3gyMJbC8'),
  cbor: Schema.unknown()
    .link()
    .parse('bafyreieuo63r3y2nuycaq4b3q2xvco3nprlxiwzcfp4cuupgaywat3z6mq'),
  rawIdentity: Schema.unknown().link().parse('bafkqaaa'),
  ipns: Schema.unknown()
    .link()
    .parse('k2k4r8kuj2bs2l996lhjx8rc727xlvthtak8o6eia3qm5adxvs5k84gf', base36),
  sha512: Schema.unknown()
    .link()
    .parse(
      'kgbuwaen1jrbjip6iwe9mqg54spvuucyz7f5jho2tkc2o0c7xzqwpxtogbyrwck57s9is6zqlwt9rsxbuvszym10nbaxt9jn7sf4eksqd',
      base36
    ),
}

const links = Object.values(fixtures)
const versions = new Set(links.map(link => link.version))
const codes = new Set(links.map(link => link.code))
const algs = new Set(links.map(link => link.multihash.code))

for (const link of links) {
  test(`${link} ➡ Schema.link()`, () => {
    assert.deepEqual(
      Schema.unknown().link().tryFrom(link),
      { ok: link },
      `${link}`
    )
  })

  for (const version of versions) {
    test(`${link} ➡ Schema.unknown().link({ version: ${version}})`, () => {
      const schema = Schema.unknown().link({ version })
      if (link.version === version) {
        assert.deepEqual(schema.tryFrom(link), { ok: link })
      } else {
        matchError(schema.tryFrom(link), /Expected link to be CID version/)
      }
    })
  }

  for (const code of codes) {
    test(`${link} ➡ Schema.link({ code: ${code}})`, () => {
      const schema = Schema.unknown().link({ codec: { code } })
      if (link.code === code) {
        assert.deepEqual(schema.tryFrom(link), { ok: link })
      } else {
        matchError(
          schema.tryFrom(link),
          /Expected link to be CID with .* codec/
        )
      }
    })
  }

  for (const code of algs) {
    test(`${link} ➡ Schema.unknown().link({ hasher: {code: ${code}} })`, () => {
      const schema = Schema.unknown().link({ hasher: { code } })
      if (link.multihash.code === code) {
        assert.deepEqual(schema.tryFrom(link), { ok: link })
      } else {
        matchError(
          schema.tryFrom(link),
          /Expected link to be CID with .* hashing algorithm/
        )
      }
    })
  }
}

test('struct().link()', () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })
  const PointLink = Point.link()

  assert.equal(PointLink.read(fixtures.pb).ok, fixtures.pb)

  assert.throws(() => PointLink.link(), /link of link/)
})

test('struct().link({ codec })', () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })
  const PointLink = Point.link({
    codec: CBOR,
  })

  assert.match(PointLink.read(fixtures.pb).error?.message || '', /0x71 code/)
  assert.equal(PointLink.read(fixtures.cbor).ok, fixtures.cbor)
})

test('struct().link({ hasher })', () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })
  const PointLink = Point.link({
    hasher: sha256,
  })

  assert.match(
    PointLink.read(fixtures.sha512).error?.message || '',
    /0x12 hashing/
  )
  assert.equal(
    PointLink.read(fixtures.cbor).ok,
    /** @type {*} */ (fixtures.cbor)
  )
})

test('struct().link({ hasher })', () => {
  const Point = Schema.struct({
    x: Schema.integer(),
    y: Schema.integer(),
  })
  const PointLink = Point.link({
    version: 1,
  })

  assert.match(PointLink.read(fixtures.pb).error?.message || '', /version 1/)
  assert.equal(PointLink.read(fixtures.cbor).ok, fixtures.cbor)
})

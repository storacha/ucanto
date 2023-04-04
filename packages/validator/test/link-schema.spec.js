import * as Schema from '../src/schema.js'
import { base36 } from 'multiformats/bases/base36'
import { test, assert, matchError } from './test.js'

const fixtures = {
  pb: Schema.Link.parse('QmTgnQBKj7eTV7ohraBCmh1DLwerUd2X9Rxzgf3gyMJbC8'),
  cbor: Schema.Link.parse(
    'bafyreieuo63r3y2nuycaq4b3q2xvco3nprlxiwzcfp4cuupgaywat3z6mq'
  ),
  rawIdentity: Schema.Link.parse('bafkqaaa'),
  ipns: Schema.Link.parse(
    'k2k4r8kuj2bs2l996lhjx8rc727xlvthtak8o6eia3qm5adxvs5k84gf',
    base36
  ),
  sha512: Schema.Link.parse(
    'kgbuwaen1jrbjip6iwe9mqg54spvuucyz7f5jho2tkc2o0c7xzqwpxtogbyrwck57s9is6zqlwt9rsxbuvszym10nbaxt9jn7sf4eksqd',
    base36
  ),
}

const links = Object.values(fixtures)
const versions = new Set(links.map(link => link.version))
const codes = new Set(links.map(link => link.code))
const algs = new Set(links.map(link => link.multihash.code))
const digests = new Set(links.map(link => link.multihash.digest))

for (const link of links) {
  test(`${link} ➡ Schema.link()`, () => {
    assert.deepEqual(Schema.link().read(link), { ok: link }, `${link}`)
  })

  for (const version of versions) {
    test(`${link} ➡ Schema.link({ version: ${version}})`, () => {
      const schema = Schema.link({ version })
      if (link.version === version) {
        assert.deepEqual(schema.read(link), { ok: link })
      } else {
        matchError(schema.read(link), /Expected link to be CID version/)
      }
    })
  }

  for (const code of codes) {
    test(`${link} ➡ Schema.link({ code: ${code}})`, () => {
      const schema = Schema.link({ code })
      if (link.code === code) {
        assert.deepEqual(schema.read(link), { ok: link })
      } else {
        matchError(schema.read(link), /Expected link to be CID with .* codec/)
      }
    })
  }

  for (const code of algs) {
    test(`${link} ➡ Schema.link({ multihash: {code: ${code}} })`, () => {
      const schema = Schema.link({ multihash: { code } })
      if (link.multihash.code === code) {
        assert.deepEqual(schema.read(link), { ok: link })
      } else {
        matchError(
          schema.read(link),
          /Expected link to be CID with .* hashing algorithm/
        )
      }
    })
  }

  for (const digest of digests) {
    test(`${link} ➡ Schema.link({ multihash: {digest} })`, () => {
      const schema = Schema.link({
        multihash: { digest: new Uint8Array(digest) },
      })
      if (link.multihash.digest === digest) {
        assert.deepEqual(schema.read(link), { ok: link })
      } else {
        matchError(schema.read(link), /Expected link with .* hash digest/)
      }
    })
  }
}

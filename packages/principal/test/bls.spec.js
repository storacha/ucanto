import * as Lib from '../src/bls.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import { varint } from 'multiformats'
import { base16 } from 'multiformats/bases/base16'
import { base64pad } from 'multiformats/bases/base64'

const ADDRESS =
  'f3vtucyrbfhfgtxl7nbzzfyt75h5chsegcahdu3krpelif62mbm67nzun3hp5mxvxfirtqwbjokwhnqgh5cj3q'
const PRIVATE_KEY =
  '7b2254797065223a22626c73222c22507269766174654b6579223a226b6874647470674f417247444a6c7152316b33583052302f58784f6564504f6c744f6c6c347876774f7a4d3d227d'
const SIGNATURE =
  '0294c135ac9b50ef9c42dcf5ce1f5dd1da517adacf79fd1cd7c09a6d90803cc706a64347e5510260cba90cf235277086341176bb4e44849dfa81abdbf9f6e38a21b074713ebcdd5906fc3894adac1e60a91c7127a711204a98e5d1ce5da6379efd'
const PAYLOAD = 'hello'

describe('signer', () => {
  const { Signer } = Lib

  it('exports', () => {
    assert.equal(Lib.code, 0x1309)
    assert.equal(Lib.name, 'BLS12-381')
    assert.equal(Lib.signatureAlgorithm, 'BLS12381G2')
    assert.equal(Lib.signatureCode, 0xd0eb)
    assert.equal(typeof Lib.fromFilecoinWallet, 'function')
    assert.equal(typeof Lib.generate, 'function')

    assert.equal(typeof Lib.Verifier, 'object')
    assert.equal(typeof Lib.Signer, 'object')
  })

  it('generate', async () => {
    const signer = await Lib.generate()
    assert.ok(signer.did().startsWith('did:key'))
    assert.equal(signer.code, 0x1309)
    assert.equal(signer.signatureCode, 0xd0eb)
    assert.equal(signer.signatureAlgorithm, 'BLS12381G2')
    assert.equal(signer.signer, signer)
    assert.equal(signer.verifier.code, 0xeb)
    assert.equal(signer.verifier.signatureCode, 0xd0eb)
    assert.equal(signer.verifier.signatureAlgorithm, 'BLS12381G2')

    const payload = await sha256.encode(new TextEncoder().encode('hello world'))
    const signature = await signer.sign(payload)

    const verifier = Lib.Verifier.parse(signer.did())
    assert.equal(
      await verifier.verify(payload, signature),
      true,
      'signer can verify signature'
    )
    assert.equal(await signer.verify(payload, signature), true)

    assert.equal(signer.signatureAlgorithm, 'BLS12381G2')
    assert.equal(signer.signatureCode, 0xd0eb)
    assert.equal(signer.did(), verifier.did())
  })

  it('SigningPrincipal.decode', async () => {
    const signer = await Lib.generate()
    const bytes = Signer.encode(signer)
    const { id, keys } = signer.toArchive()

    const signer2 = Signer.decode(keys[id])
    assert.deepEqual(signer2.verifier, signer.verifier)
    assert.deepEqual(signer2, signer)

    const invalid = new Uint8Array(keys[id])
    varint.encodeTo(4, invalid, 0)
    assert.throws(() => Signer.decode(invalid), /must be a multiformat with/)

    assert.throws(
      () => Signer.decode(keys[id].slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )

    const malformed = new Uint8Array(keys[id])
    // @ts-ignore
    varint.encodeTo(4, malformed)

    assert.throws(() => Signer.decode(malformed), /must be a multiformat with/)
  })

  it('SigningPrincipal decode encode roundtrip', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(Signer.decode(Signer.encode(signer)), signer)
  })

  it('SigningPrincipal.format', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(Signer.parse(Signer.format(signer)), signer)
  })

  it('SigningPrincipal.did', async () => {
    const signer = await Lib.generate()

    assert.equal(signer.did().startsWith('did:key:'), true)
  })

  it('toArchive <-> from', async () => {
    const signer = await Lib.generate()
    const archive = signer.toArchive()
    const imported = Signer.from(archive)

    assert.deepEqual(imported.verifier, signer.verifier)

    assert.deepEqual(signer, imported)

    const web = signer.withDID('did:web:example.com')
    assert.deepEqual(signer.toDIDKey(), signer.did())
    assert.deepEqual(web.toDIDKey(), signer.did())
    assert.throws(
      () => Signer.from(web.toArchive()),
      /Unsupported archive format/
    )
  })

  it('fromFilecoinWallet', async () => {
    const signer = Lib.fromFilecoinWallet(PRIVATE_KEY)
    assert.deepEqual(signer.toFilecoinWallet(), PRIVATE_KEY)

    assert.throws(
      () =>
        Lib.fromFilecoinWallet(
          base16.baseEncode(
            new TextEncoder().encode(
              JSON.stringify({
                Type: 'secp256k1',
                PrivateKey: base64pad.baseEncode(
                  signer.secret.slice().reverse()
                ),
              })
            )
          )
        ),
      /unsupported key type/i
    )

    assert.throws(
      () =>
        Lib.fromFilecoinWallet(
          base16.baseEncode(
            new TextEncoder().encode(
              JSON.stringify({
                Type: 'bls',
                PrivateKey: base64pad.baseEncode(
                  signer.secret.slice(0, -2).reverse()
                ),
              })
            )
          )
        ),
      /Uint8Array with byteLength of 32/i
    )

    const sig = await signer.sign(new TextEncoder().encode(PAYLOAD))

    const verifier = Lib.Verifier.fromFilecoinAddress(ADDRESS)
    assert.equal(
      await verifier.verify(new TextEncoder().encode(PAYLOAD), sig),
      true
    )

    assert.deepEqual(sig.raw, base16.baseDecode(SIGNATURE.slice(2)))
  })
})

describe('verifier', () => {
  const { Verifier, Signer } = Lib

  it('exports', async () => {
    assert.equal(Verifier, await import('../src/bls/verifier.js'))
    assert.equal(Verifier.code, 0xeb)
    assert.equal(Verifier.signatureAlgorithm, 'BLS12381G2')
  })

  it('Verifier.parse', async () => {
    const signer = await Lib.generate()
    const verifier = Verifier.parse(signer.did())
    const { id, keys } = signer.toArchive()
    const bytes = keys[id]

    assert.deepEqual(
      bytes,
      // @ts-expect-error
      signer.bytes
    )
    assert.equal(verifier.did(), signer.did())
  })

  it('Verifier.decode', async () => {
    const signer = await Lib.generate()

    const bytes = base58btc.decode(signer.toDIDKey().slice('did:key:'.length))

    assert.deepEqual(Verifier.decode(bytes), signer.verifier)

    const invalid = new Uint8Array(bytes)
    varint.encodeTo(4, invalid)
    assert.throws(
      () => Verifier.decode(invalid),
      /key algorithm with multicode/
    )

    assert.throws(
      () => Verifier.decode(bytes.slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )
  })

  it('Verifier.format', async () => {
    const signer = await Lib.generate()
    const verifier = Verifier.parse(signer.did())

    assert.deepEqual(Verifier.format(verifier), signer.did())
  })

  it('Verifier.encode', async () => {
    const { verifier } = await Lib.generate()

    const bytes = Verifier.encode(verifier)
    assert.deepEqual(Verifier.decode(bytes), verifier)
  })

  it('signer toArchive', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(
      {
        id: signer.did(),
        /** @type {Record<`did:key:${string}`, Uint8Array>} */
        keys: {
          [signer.did()]: Signer.encode(signer),
        },
      },
      signer.toArchive()
    )
  })

  it('derive from filecoin address', () => {
    const address = ADDRESS
    const verifier = Verifier.fromFilecoinAddress(address)

    assert.deepEqual(verifier.code, Verifier.code)
    assert.deepEqual(verifier.toFilecoinAddress(), address)

    const testnet = Verifier.fromFilecoinAddress(`t${address.slice(1)}`)
    assert.deepEqual(testnet.publicKey, verifier.publicKey)
    assert.deepEqual(testnet.toFilecoinAddress('t'), `t${address.slice(1)}`)

    assert.throws(
      () => Verifier.fromFilecoinAddress(`d${address.slice(1)}`),
      /unsupported network identifier/i
    )

    assert.throws(
      () => Verifier.fromFilecoinAddress(`f4${address.slice(2)}`),
      /unsupported protocol identifier/
    )

    assert.throws(
      () => Verifier.fromFilecoinAddress(`${address.slice(0, -2)}2q`),
      /invalid checksum/
    )

    assert.throws(
      () =>
        verifier.toFilecoinAddress(
          // @ts-expect-error - invalid network id
          'u'
        ),
      /Unsupported network identifier/
    )
  })

  it('did', async () => {
    const { verifier } = await Lib.generate()
    assert.deepEqual(verifier.toDIDKey(), verifier.did())
    assert.deepEqual(
      verifier.did(),
      `did:key:${base58btc.encode(
        new Uint8Array([...Verifier.KEY_PREFIX, ...verifier.publicKey])
      )}`
    )

    const web = verifier.withDID('did:web:example.com')
    assert.deepEqual(web.did(), 'did:web:example.com')
    assert.deepEqual(web.toDIDKey(), verifier.did())
  })
})

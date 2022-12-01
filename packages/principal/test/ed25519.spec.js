import { ed25519, ed25519 as Lib } from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { varint } from 'multiformats'

describe('signing principal', () => {
  const { Signer } = Lib

  it('exports', () => {
    assert.equal(Lib.code, 0x1300)
    assert.equal(Lib.name, 'Ed25519')
    assert.equal(Lib.signatureAlgorithm, 'EdDSA')
    assert.equal(Lib.signatureCode, 0xd0ed)
    assert.equal(typeof Lib.derive, 'function')
    assert.equal(typeof Lib.generate, 'function')

    assert.equal(typeof Lib.Verifier, 'object')
    assert.equal(typeof Lib.Signer, 'object')
  })

  it('generate', async () => {
    const signer = await Lib.generate()
    assert.ok(signer.did().startsWith('did:key'))
    assert.equal(signer.code, 0x1300)
    assert.equal(signer.signatureCode, 0xd0ed)
    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signer, signer)
    assert.equal(signer.verifier.code, 0xed)
    assert.equal(signer.verifier.signatureCode, 0xd0ed)
    assert.equal(signer.verifier.signatureAlgorithm, 'EdDSA')

    const payload = await sha256.encode(new TextEncoder().encode('hello world'))
    const signature = await signer.sign(payload)

    const verifier = Lib.Verifier.parse(signer.did())
    assert.equal(
      await verifier.verify(payload, signature),
      true,
      'signer can verify signature'
    )
    assert.equal(await signer.verify(payload, signature), true)

    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signatureCode, 0xd0ed)
    assert.equal(signer.did(), verifier.did())
  })

  it('derive', async () => {
    const original = await Lib.generate()
    // @ts-expect-error - secret is not defined by interface
    const derived = await Lib.derive(original.secret)

    // @ts-expect-error - secret is not defined by interface
    assert.deepEqual(original.secret, derived.secret)
    assert.equal(original.did(), derived.did())
  })

  it('derive throws on bad input', async () => {
    // @ts-expect-error - secret is not defined by interface
    const { secret } = await Lib.generate()
    try {
      await Lib.derive(secret.subarray(1))
      assert.fail('Expected to throw')
    } catch (error) {
      assert.match(String(error), /Expected Uint8Array with byteLength of 32/)
    }
  })

  it('SigningPrincipal.decode', async () => {
    const signer = await Lib.generate()
    const bytes = Signer.encode(signer)
    const { id, keys } = signer.toArchive()

    assert.deepEqual(Signer.decode(keys[id]), signer)

    const invalid = new Uint8Array(keys[id])
    varint.encodeTo(4, invalid, 0)
    assert.throws(() => Signer.decode(invalid), /must be a multiformat with/)

    assert.throws(
      () => Signer.decode(keys[id].slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )

    const malformed = new Uint8Array(keys[id])
    // @ts-ignore
    varint.encodeTo(4, malformed, Signer.PUB_KEY_OFFSET)

    assert.throws(() => Signer.decode(malformed), /must contain public key/)
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
})

describe('principal', () => {
  const { Verifier, Signer } = Lib

  it('exports', async () => {
    assert.equal(Verifier, await import('../src/ed25519/verifier.js'))
    assert.equal(Verifier.code, 0xed)
    assert.equal(Verifier.signatureAlgorithm, 'EdDSA')
  })

  it('Verifier.parse', async () => {
    const signer = await Lib.generate()
    const verifier = Verifier.parse(signer.did())
    const { id, keys } = signer.toArchive()
    const bytes = keys[id]

    assert.deepEqual(
      new Uint8Array(bytes.buffer, bytes.byteOffset + Signer.PUB_KEY_OFFSET),
      Object(verifier)
    )
    assert.equal(verifier.did(), signer.did())
  })

  it('Verifier.decode', async () => {
    const signer = await Lib.generate()
    const { id, keys } = signer.toArchive()
    const bytes = keys[id]

    const verifier = new Uint8Array(
      bytes.buffer,
      bytes.byteOffset + Signer.PUB_KEY_OFFSET
    )
    assert.deepEqual(Object(Verifier.decode(verifier)), verifier)
    assert.throws(() => Verifier.decode(bytes), /key algorithm with multicode/)

    assert.throws(
      () => Verifier.decode(verifier.slice(0, 32)),
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

  it('can parse keys with forward slash', async () => {
    // @see https://github.com/web3-storage/ucanto/issues/85
    const key =
      'MgCYY9lYduqC9rrtD1YvZzcEfPCFBaYsTe0T+8RLLBawPWu0BAaNqeI86jQPsOeSaZ7p+ZPWGFqggfvSMFw+AJ7BH8/U='
    const ed = ed25519.parse(key)
    assert.equal(
      ed.did(),
      'did:key:z6MkeZeyji49ZVbinyPENzhZMVML7s79bbjN9K4iNFBsFkdr'
    )

    assert.equal(ed25519.format(ed), key)

    const payload = new TextEncoder().encode('hello world')
    assert.equal(await ed.verify(payload, await ed.sign(payload)), true)
  })
})

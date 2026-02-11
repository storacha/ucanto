import { ed25519, ed25519 as Lib } from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { varint } from 'multiformats'
import { base64url } from 'multiformats/bases/base64'
import { webcrypto } from 'one-webcrypto'

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

  it('generate non extractable by default', async () => {
    const signer = await Lib.generate()
    const { id, keys } = signer.toArchive()
    const key = /** @type {CryptoKey} */ (keys[id])

    assert.equal(key.type, 'private')
    assert.deepEqual(Object(key.algorithm), { name: 'Ed25519' })
    assert.equal(key.extractable, false)
    assert.deepEqual(key.usages, ['sign'])
  })

  it('derive', async () => {
    const original = await Lib.generate({ extractable: true })
    // @ts-expect-error - secret is not defined by interface
    const derived = await Lib.derive(original.secret)

    // @ts-expect-error - secret is not defined by interface
    assert.deepEqual(original.secret, derived.secret)
    assert.equal(original.did(), derived.did())
  })

  it('derive throws on bad input', async () => {
    // @ts-expect-error - secret is not defined by interface
    const { secret } = await Lib.generate({ extractable: true })
    try {
      await Lib.derive(secret.subarray(1))
      assert.fail('Expected to throw')
    } catch (error) {
      assert.match(String(error), /Expected Uint8Array with byteLength of 32/)
    }
  })

  it('SigningPrincipal.decode', async () => {
    const signer = await Lib.generate({ extractable: true })
    const bytes = Signer.encode(signer)
    const { id, keys } = signer.toArchive()
    const key = keys[id]
    if (!(key instanceof Uint8Array)) {
      return assert.fail('Expected archive key to be Uint8Array')
    }

    assert.deepEqual(Signer.decode(key), signer)

    const invalid = new Uint8Array(key)
    varint.encodeTo(4, invalid, 0)
    assert.throws(() => Signer.decode(invalid), /must be a multiformat with/)

    assert.throws(
      () => Signer.decode(key.slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )

    const malformed = new Uint8Array(key)
    // @ts-ignore
    varint.encodeTo(4, malformed, Signer.PUB_KEY_OFFSET)

    assert.throws(() => Signer.decode(malformed), /must contain public key/)
  })

  it('SigningPrincipal decode encode roundtrip', async () => {
    const signer = await Lib.generate({ extractable: true })

    assert.deepEqual(Signer.decode(Signer.encode(signer)), signer)
  })

  it('SigningPrincipal.format', async () => {
    const signer = await Lib.generate({ extractable: true })

    assert.deepEqual(Signer.parse(Signer.format(signer)), signer)
  })

  it('SigningPrincipal.did', async () => {
    const signer = await Lib.generate({ extractable: true })

    assert.equal(signer.did().startsWith('did:key:'), true)
  })

  it('extractable signer supports Signer interface helpers', async () => {
    const signer = await Lib.generate({ extractable: true })
    const alias = signer.withDID('did:web:example.com')
    const payload = new TextEncoder().encode('hello world')
    const signature = await signer.sign(payload)

    assert.equal(signer.code, 0x1300)
    assert.equal(signer.signer, signer)
    assert.equal(signer.toDIDKey(), signer.did())
    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(await alias.verify(payload, signature), true)
  })

  it('generate extractable throws on unsupported pkcs8 key length', async () => {
    const exportKey = /** @type {any} */ (webcrypto.subtle.exportKey)
    webcrypto.subtle.exportKey = async function (format, key) {
      if (format === 'pkcs8') {
        return new Uint8Array(47)
      }
      return exportKey.call(this, format, key)
    }

    try {
      await Lib.generate({ extractable: true })
      assert.fail('Expected to throw')
    } catch (error) {
      assert.match(String(error), /Unsupported ed25519 pkcs8 key length/)
    } finally {
      webcrypto.subtle.exportKey =
        /** @type {typeof webcrypto.subtle.exportKey} */ (exportKey)
    }
  })

  it('generate extractable throws on unsupported pkcs8 key format', async () => {
    const exportKey = /** @type {any} */ (webcrypto.subtle.exportKey)
    webcrypto.subtle.exportKey = async function (format, key) {
      if (format === 'pkcs8') {
        const pkcs8 = new Uint8Array(await exportKey.call(this, format, key))
        pkcs8[0] = 0x00
        return pkcs8
      }
      return exportKey.call(this, format, key)
    }

    try {
      await Lib.generate({ extractable: true })
      assert.fail('Expected to throw')
    } catch (error) {
      assert.match(String(error), /Unsupported ed25519 pkcs8 key format/)
    } finally {
      webcrypto.subtle.exportKey =
        /** @type {typeof webcrypto.subtle.exportKey} */ (exportKey)
    }
  })

  it('derive throws when JWK has no x', async () => {
    const exportKey = /** @type {any} */ (webcrypto.subtle.exportKey)
    webcrypto.subtle.exportKey = async function (format, key) {
      if (format === 'jwk') {
        return {}
      }
      return exportKey.call(this, format, key)
    }

    try {
      await Lib.derive(new Uint8Array(32))
      assert.fail('Expected to throw')
    } catch (error) {
      assert.match(String(error), /Can not derive ed25519 public key from JWK/)
    } finally {
      webcrypto.subtle.exportKey =
        /** @type {typeof webcrypto.subtle.exportKey} */ (exportKey)
    }
  })

  it('derive throws when JWK x has invalid size', async () => {
    const exportKey = /** @type {any} */ (webcrypto.subtle.exportKey)
    webcrypto.subtle.exportKey = async function (format, key) {
      if (format === 'jwk') {
        return { x: base64url.baseEncode(new Uint8Array(31)) }
      }
      return exportKey.call(this, format, key)
    }

    try {
      await Lib.derive(new Uint8Array(32))
      assert.fail('Expected to throw')
    } catch (error) {
      assert.match(String(error), /Expected JWK public key with byteLength 32/)
    } finally {
      webcrypto.subtle.exportKey =
        /** @type {typeof webcrypto.subtle.exportKey} */ (exportKey)
    }
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
    const signer = await Lib.generate({ extractable: true })
    const verifier = Verifier.parse(signer.did())
    const { id, keys } = signer.toArchive()
    const bytes = keys[id]
    if (!(bytes instanceof Uint8Array)) {
      return assert.fail('Expected archive key to be Uint8Array')
    }

    assert.deepEqual(
      new Uint8Array(bytes.buffer, bytes.byteOffset + Signer.PUB_KEY_OFFSET),
      Object(verifier)
    )
    assert.equal(verifier.did(), signer.did())
  })

  it('Verifier.decode', async () => {
    const signer = await Lib.generate({ extractable: true })
    const { id, keys } = signer.toArchive()
    const bytes = keys[id]
    if (!(bytes instanceof Uint8Array)) {
      return assert.fail('Expected archive key to be Uint8Array')
    }

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
    const signer = await Lib.generate({ extractable: true })
    const verifier = Verifier.parse(signer.did())

    assert.deepEqual(Verifier.format(verifier), signer.did())
  })

  it('Verifier.encode', async () => {
    const { verifier } = await Lib.generate()

    const bytes = Verifier.encode(verifier)
    assert.deepEqual(Verifier.decode(bytes), verifier)
  })

  it('signer toArchive', async () => {
    const signer = await Lib.generate({ extractable: true })

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
    // @see https://github.com/storacha/ucanto/issues/85
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

  it('can archive and restore non extractable key', async () => {
    const signer = await Lib.generate()
    const archive = signer.toArchive()
    const restored = Signer.from(archive)
    const payload = new TextEncoder().encode('hello world')

    const signature = await restored.sign(payload)
    assert.equal(await signer.verify(payload, signature), true)
    assert.equal(await restored.verify(payload, signature), true)

    const key = /** @type {CryptoKey} */ (archive.keys[archive.id])
    try {
      await webcrypto.subtle.exportKey('pkcs8', key)
      assert.fail('Expected exportKey(pkcs8) to fail for non extractable key')
    } catch (error) {
      assert.match(String(error), /extractable/i)
    }
  })

  it('can not encode non extractable key', async () => {
    const signer = await Lib.generate()
    assert.throws(
      () => Signer.encode(signer),
      /Unextractable ed25519 key can not be encoded/
    )
  })
})

import { P256, P256 as Lib } from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { varint } from 'multiformats'

describe('P-256 signing principal', () => {
  const { Signer } = Lib

  it('exports', () => {
    assert.equal(Lib.code, 0x1301)
    assert.equal(Lib.name, 'P256')
    assert.equal(Lib.signatureAlgorithm, 'ES256')
    assert.equal(Lib.signatureCode, 0xd01200)
    assert.equal(typeof Lib.derive, 'function')
    assert.equal(typeof Lib.generate, 'function')

    assert.equal(typeof Lib.Verifier, 'object')
    assert.equal(typeof Lib.Signer, 'object')
  })

  it('generate', async () => {
    const signer = await Lib.generate()
    assert.ok(signer.did().startsWith('did:key'))
    assert.equal(signer.code, 0x1301)
    assert.equal(signer.signatureCode, 0xd01200)
    assert.equal(signer.signatureAlgorithm, 'ES256')
    assert.equal(signer.signer, signer)
    assert.equal(signer.verifier.code, 0x1200)
    assert.equal(signer.verifier.signatureCode, 0xd01200)
    assert.equal(signer.verifier.signatureAlgorithm, 'ES256')

    const payload = await sha256.encode(new TextEncoder().encode('hello world'))
    const signature = await signer.sign(payload)

    const verifier = Lib.Verifier.parse(signer.did())
    assert.equal(
      await verifier.verify(payload, signature),
      true,
      'signer can verify signature'
    )
    assert.equal(await signer.verify(payload, signature), true)

    assert.equal(signer.signatureAlgorithm, 'ES256')
    assert.equal(signer.signatureCode, 0xd01200)
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

  it('toDIDKey', async () => {
    const signer = await Lib.generate()
    const didKey = signer.toDIDKey()
    
    assert.equal(didKey.startsWith('did:key:'), true)
    assert.equal(didKey, signer.did()) // For P-256, toDIDKey should return same as did()
  })

  it('withDID', async () => {
    const signer = await Lib.generate()
    const customDID = 'did:web:example.com'
    const customSigner = signer.withDID(customDID)
    
    assert.equal(customSigner.did(), customDID)
    assert.equal(customSigner.toDIDKey(), signer.did()) // Should still reference original key
    assert.equal(customSigner.signatureAlgorithm, signer.signatureAlgorithm)
    assert.equal(customSigner.signatureCode, signer.signatureCode)
    
    // Should be able to sign with custom DID
    const payload = new TextEncoder().encode('test message')
    const signature = await customSigner.sign(payload)
    assert.equal(await customSigner.verify(payload, signature), true)
  })

  it('from archive', async () => {
    const original = await Lib.generate()
    const archive = original.toArchive()
    
    // Test successful restoration from archive
    const restored = Lib.from(archive)
    assert.equal(restored.did(), original.did())
    assert.equal(restored.signatureAlgorithm, original.signatureAlgorithm)
    
    // Test that restored signer works
    const payload = new TextEncoder().encode('test message')
    const signature = await restored.sign(payload)
    assert.equal(await original.verify(payload, signature), true)
    
    // Test error case: non-did:key archive
    const invalidArchive = {
      id: 'did:web:example.com',
      keys: archive.keys
    }
    assert.throws(() => Lib.from(invalidArchive), /Unsupported archive format/)
    
    // Test error case: keys not Uint8Array
    const invalidKeysArchive = {
      id: archive.id,
      keys: { [archive.id]: 'not-uint8array' }
    }
    assert.throws(() => Lib.from(invalidKeysArchive), /Unsupported archive format/)
  })
})

describe('P-256 verifying principal', () => {
  const { Verifier, Signer } = Lib

  it('exports', async () => {
    assert.equal(Verifier, await import('../src/p256/verifier.js'))
    assert.equal(Verifier.code, 0x1200)
    assert.equal(Verifier.signatureAlgorithm, 'ES256')
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

  it('signature verification works correctly', async () => {
    const signer = await Lib.generate()
    const payload = new TextEncoder().encode('hello P-256 world')
    const signature = await signer.sign(payload)
    
    // Verify with signer
    assert.equal(await signer.verify(payload, signature), true)
    
    // Verify with verifier
    assert.equal(await signer.verifier.verify(payload, signature), true)
    
    // Verify with parsed verifier
    const verifier = Verifier.parse(signer.did())
    assert.equal(await verifier.verify(payload, signature), true)
    
    // Wrong payload should fail
    const wrongPayload = new TextEncoder().encode('wrong message')
    assert.equal(await verifier.verify(wrongPayload, signature), false)
  })

  it('verifier error handling', async () => {
    const signer = await Lib.generate()
    const verifier = signer.verifier
    const payload = new TextEncoder().encode('test message')
    
    // Test with signature that has wrong algorithm code (should fail fast)
    const wrongCodeSig = {
      code: 0x9999, // Wrong signature code
      raw: new Uint8Array(64).fill(1) // Valid length but wrong code
    }
    assert.equal(await verifier.verify(payload, wrongCodeSig), false)
    
    // Test with malformed signature that should trigger catch block in p256.verify
    // Use correct code but invalid signature format to trigger crypto library error
    const malformedSig = {
      code: verifier.signatureCode, // Correct code
      raw: new Uint8Array([1, 2, 3]) // Too short - will cause p256.verify to throw
    }
    
    // This should return false due to p256.verify throwing an error (triggers catch block)
    assert.equal(await verifier.verify(payload, malformedSig), false)
    
    // Test with another type of malformed signature
    const invalidSig = {
      code: verifier.signatureCode,
      raw: new Uint8Array(64).fill(255) // Wrong signature bytes
    }
    assert.equal(await verifier.verify(payload, invalidSig), false)
    
    // Test with different malformed signature that should trigger p256.verify error
    // Use signature with correct code but malformed raw bytes
    const malformedSigBytes = {
      code: verifier.signatureCode,
      raw: new Uint8Array(64) // Correct length but all zeros - invalid signature
    }
    assert.equal(await verifier.verify(payload, malformedSigBytes), false)
    
    // Try signature with random bytes that should trigger p256.verify to throw
    const randomSig = {
      code: verifier.signatureCode,
      raw: new Uint8Array([0x30, 0x45, 0x02, 0x20]) // Start of DER format but incomplete
    }
    assert.equal(await verifier.verify(payload, randomSig), false)
    
    // Test with null signature raw to force p256.verify to throw
    const nullSig = {
      code: verifier.signatureCode,
      raw: null // This will cause p256.verify to throw: "invalid signature, expected Uint8Array"
    }
    
    // This should trigger the catch block (lines 114-115) because p256.verify throws with null
    assert.equal(await verifier.verify(payload, nullSig), false)
    
    // Test with undefined signature raw as well
    const undefinedSig = {
      code: verifier.signatureCode,
      raw: undefined // This should also cause p256.verify to throw
    }
    
    assert.equal(await verifier.verify(payload, undefinedSig), false)
  })

  it('verifier withDID', async () => {
    const signer = await Lib.generate()
    const verifier = signer.verifier
    const customDID = 'did:web:example.com'
    
    const customVerifier = verifier.withDID(customDID)
    assert.equal(customVerifier.did(), customDID)
    assert.equal(customVerifier.toDIDKey(), verifier.did())
    
    // Should still be able to verify signatures from original signer
    const payload = new TextEncoder().encode('test message')
    const signature = await signer.sign(payload)
    assert.equal(await customVerifier.verify(payload, signature), true)
  })

  it('verifier toDIDKey', async () => {
    const signer = await Lib.generate()
    const verifier = signer.verifier
    
    const didKey = verifier.toDIDKey()
    assert.equal(didKey.startsWith('did:key:'), true)
    assert.equal(didKey, verifier.did()) // For P-256 verifier, toDIDKey should return same as did()
  })
})
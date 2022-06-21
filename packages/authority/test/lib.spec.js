import * as Lib from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { varint } from 'multiformats'

describe('signing authority', () => {
  const { SigningAuthority } = Lib
  it('exports', () => {
    assert.equal(Lib.name, 'Ed25519')
    assert.equal(Lib.code, 0x1300)
    assert.equal(typeof Lib.derive, 'function')
    assert.equal(typeof Lib.generate, 'function')

    assert.equal(typeof Lib.Authority, 'object')
    assert.equal(typeof Lib.SigningAuthority, 'object')
  })

  it('generate', async () => {
    const signer = await Lib.generate()
    assert.ok(signer.did().startsWith('did:key'))
    assert.equal(signer.did(), signer.authority.did())
    assert.ok(signer.bytes instanceof Uint8Array)
    assert.ok(signer.buffer instanceof ArrayBuffer)

    const payload = await sha256.encode(new TextEncoder().encode('hello world'))
    const signature = await signer.sign(payload)
    assert.ok(
      await signer.verify(payload, signature),
      'signer can verify signature'
    )
    assert.ok(
      await signer.authority.verify(payload, signature),
      'authority can verify signature'
    )
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

  it('SigningAuthority.decode', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(SigningAuthority.decode(signer.bytes), signer)

    const invalid = new Uint8Array(signer.bytes)
    varint.encodeTo(4, invalid, 0)
    assert.throws(
      () => SigningAuthority.decode(invalid),
      /must be a multiformat with/
    )

    assert.throws(
      () => SigningAuthority.decode(signer.bytes.slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )

    const malformed = new Uint8Array(signer.bytes)
    varint.encodeTo(4, malformed, signer.authority.byteOffset)

    assert.throws(
      () => SigningAuthority.decode(malformed),
      /must contain public key/
    )
  })

  it('SigningAuthority decode encode roundtrip', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(
      SigningAuthority.decode(SigningAuthority.encode(signer)),
      signer
    )
  })

  it('SigningAuthority.format', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(
      SigningAuthority.parse(SigningAuthority.format(signer)),
      signer
    )
  })

  it('SigningAuthority.did', async () => {
    const signer = await Lib.generate()

    assert.equal(signer.did().startsWith('did:key:'), true)
  })
})

describe('authority', () => {
  const { Authority } = Lib

  it('exports', async () => {
    assert.equal(Authority, await import('../src/authority.js'))
    assert.equal(Authority.code, 0xed)
    assert.equal(Authority.name, 'Ed25519')
  })

  it('Athority.parse', async () => {
    const signer = await Lib.generate()
    const authority = Authority.parse(signer.did())

    assert.deepEqual(authority.bytes, signer.authority.bytes)
    assert.equal(authority.did(), signer.did())
  })

  it('Athority.decode', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(Authority.decode(signer.authority.bytes), signer.authority)
    assert.throws(
      () => Authority.decode(signer.bytes),
      /key algorithm with multicode/
    )

    assert.throws(
      () => Authority.decode(signer.authority.bytes.slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )
  })

  it('Authority.format', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(Authority.format(signer.authority), signer.did())
  })

  it('Authority.encode', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(
      [...Authority.encode(signer.authority)],
      [...signer.authority.bytes]
    )
  })
})

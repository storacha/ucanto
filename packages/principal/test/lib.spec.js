import * as Lib from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { varint } from 'multiformats'

describe('signing principal', () => {
  const { SigningPrincipal } = Lib

  it('exports', () => {
    assert.equal(Lib.name, 'Ed25519')
    assert.equal(Lib.code, 0x1300)
    assert.equal(typeof Lib.derive, 'function')
    assert.equal(typeof Lib.generate, 'function')

    assert.equal(typeof Lib.Principal, 'object')
    assert.equal(typeof Lib.SigningPrincipal, 'object')
  })

  it('generate', async () => {
    const signer = await Lib.generate()
    assert.ok(signer.did().startsWith('did:key'))
    assert.equal(signer.did(), signer.principal.did())
    assert.ok(signer.bytes instanceof Uint8Array)
    assert.ok(signer.buffer instanceof ArrayBuffer)

    const payload = await sha256.encode(new TextEncoder().encode('hello world'))
    const signature = await signer.sign(payload)
    assert.ok(
      await signer.verify(payload, signature),
      'signer can verify signature'
    )
    assert.ok(
      await signer.principal.verify(payload, signature),
      'principal can verify signature'
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

  it('Agent.decode', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(SigningPrincipal.decode(signer.bytes), signer)

    const invalid = new Uint8Array(signer.bytes)
    varint.encodeTo(4, invalid, 0)
    assert.throws(
      () => SigningPrincipal.decode(invalid),
      /must be a multiformat with/
    )

    assert.throws(
      () => SigningPrincipal.decode(signer.bytes.slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )

    const malformed = new Uint8Array(signer.bytes)
    varint.encodeTo(4, malformed, signer.principal.byteOffset)

    assert.throws(
      () => SigningPrincipal.decode(malformed),
      /must contain public key/
    )
  })

  it('Agent decode encode roundtrip', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(
      SigningPrincipal.decode(SigningPrincipal.encode(signer)),
      signer
    )
  })

  it('Agent.format', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(
      SigningPrincipal.parse(SigningPrincipal.format(signer)),
      signer
    )
  })

  it('Agent.did', async () => {
    const signer = await Lib.generate()

    assert.equal(signer.did().startsWith('did:key:'), true)
  })
})

describe('principal', () => {
  const { Principal } = Lib

  it('exports', async () => {
    assert.equal(Principal, await import('../src/principal.js'))
    assert.equal(Principal.code, 0xed)
    assert.equal(Principal.name, 'Ed25519')
  })

  it('Principal.parse', async () => {
    const signer = await Lib.generate()
    const principal = Principal.parse(signer.did())

    assert.deepEqual(principal.bytes, signer.principal.bytes)
    assert.equal(principal.did(), signer.did())
  })

  it('Principal.decode', async () => {
    const signer = await Lib.generate()

    assert.deepEqual(Principal.decode(signer.principal.bytes), signer.principal)
    assert.throws(
      () => Principal.decode(signer.bytes),
      /key algorithm with multicode/
    )

    assert.throws(
      () => Principal.decode(signer.principal.bytes.slice(0, 32)),
      /Expected Uint8Array with byteLength/
    )
  })

  it('Principal.format', async () => {
    const agent = await Lib.generate()

    assert.deepEqual(Principal.format(agent.principal), agent.did())
  })

  it('Principal.encode', async () => {
    const agent = await Lib.generate()

    assert.deepEqual(
      [...Principal.encode(agent.principal)],
      [...agent.principal.bytes]
    )
  })
})

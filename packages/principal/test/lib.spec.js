import * as API from '@ucanto/interface'
import { Verifier, Signer, ed25519, RSA } from '../src/lib.js'
import { assert } from 'chai'

const utf8 = new TextEncoder()
describe('PrincipalParser', () => {
  it('parse & verify', async () => {
    const ed = await ed25519.generate()
    const rsa = await RSA.generate()

    const edp = Verifier.parse(ed.did())

    const payload = utf8.encode('hello ed')

    assert.equal(await edp.verify(payload, await ed.sign(payload)), true)
    assert.equal(await edp.verify(payload, await rsa.sign(payload)), false)

    const rsap = Verifier.parse(rsa.did())
    assert.equal(await rsap.verify(payload, await ed.sign(payload)), false)
    assert.equal(await rsap.verify(payload, await rsa.sign(payload)), true)
  })

  it('throws on unknown did', () => {
    assert.throws(
      () => Verifier.parse('did:echo:boom'),
      /Unsupported principal/
    )
  })

  it('throws on invalid ed archive', async () => {
    const ed = await ed25519.generate()
    const rsa = await RSA.generate()

    const { key } = /** @type {API.SignerInfo} */ (rsa.toArchive())

    const archive = { did: ed.did(), key }

    assert.throws(() => Signer.from(archive), /Unsupported signer/)
  })

  it('ed decode & sign', async () => {
    const ed = await ed25519.generate()

    const bytes = ed.toArchive()
    const signer = Signer.from(bytes)
    const payload = utf8.encode('hello ed')

    const signature = await signer.sign(payload)
    assert.equal(
      await ed.verify(
        payload,
        /** @type {API.Signature<unknown, typeof ed.signatureCode>} */ (
          signature
        )
      ),
      true
    )
  })

  it('rsa decode & sign', async () => {
    const rsa = await RSA.generate({ extractable: true })

    const signer = Signer.from(rsa.toArchive())
    const payload = utf8.encode('hello ed')

    const signature = await signer.sign(payload)
    assert.equal(
      await rsa.verify(
        payload,
        /** @type {API.Signature<unknown, typeof rsa.signatureCode>} */ (
          signature
        )
      ),
      true
    )
  })

  it('throws on unknown signer', () => {
    assert.throws(
      () => Signer.from(new Uint8Array([1, 1, 1])),
      /Unsupported signer/
    )
  })
})

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

  it('ed decode & sign', async () => {
    const ed = await ed25519.generate()

    if (!ed.export) {
      assert.fail('expect to have export method')
    }

    const bytes = await ed.export()
    const signer = Signer.decode(bytes)
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

  it('ed decode & sign', async () => {
    const rsa = await RSA.generate({ extractable: true })

    if (!rsa.export) {
      assert.fail('expect to have export method')
    }

    const bytes = await rsa.export()
    const signer = Signer.decode(bytes)
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
      () => Signer.decode(new Uint8Array([1, 1, 1])),
      /Unsupported signer/
    )
  })
})

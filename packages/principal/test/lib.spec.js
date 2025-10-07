import * as API from '@ucanto/interface'
import { Verifier, Signer, ed25519, RSA } from '../src/lib.js'
import { assert } from 'chai'

const utf8 = new TextEncoder()
describe('PrincipalParser', () => {
  it('parse & verify', async () => {
    const ed = await ed25519.generate()
    const rsa = await RSA.generate()

    const edp = Verifier.parse(ed.did())
    const rsap = Verifier.parse(rsa.did())

    const payload = utf8.encode('hello algorithms')

    // Test that each verifier only accepts its own signatures
    assert.equal(await edp.verify(payload, await ed.sign(payload)), true)
    assert.equal(await edp.verify(payload, await rsa.sign(payload)), false)

    assert.equal(await rsap.verify(payload, await ed.sign(payload)), false)
    assert.equal(await rsap.verify(payload, await rsa.sign(payload)), true)
  })

  it('throws on unknown did', () => {
    assert.throws(
      () =>
        // @ts-expect-error - not a did string
        Verifier.parse('bib:echo:boom'),
      /Expected did instead got bib:echo:boom/
    )
  })

  it('throws on invalid ed archive', async () => {
    const ed = await ed25519.generate()
    const rsa = await RSA.generate()

    const { id, keys } = rsa.toArchive()

    const archive = { id: ed.did(), keys }

    assert.throws(() => Signer.from(archive), /Unsupported signer/)
  })

  it('throws on invalid did:key', () => {
    assert.throws(
      () => Verifier.parse('did:key:zBob'),
      /Unsupported did did:key:zBob/
    )
  })

  it('ed decode & sign', async () => {
    const ed = await ed25519.generate()

    const archive = ed.toArchive()
    const signer = Signer.from(archive)
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
    const payload = utf8.encode('hello rsa')

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


  it('throws on unknown signer', async () => {
    const ed = await ed25519.generate()
    const id = ed.did()

    assert.throws(
      () =>
        Signer.from({
          id,
          keys: { [id]: new Uint8Array([1, 1, 1]) },
        }),
      /Unsupported signer/
    )
  })

  it('RSA.Verifier.or(ed25519.Verifier)', async () => {
    const ed = await ed25519.generate()
    const rsa = await RSA.generate()
    const Verifier = RSA.Verifier.or(ed25519.Verifier)

    assert.deepEqual(Verifier.parse(ed.did()), ed.verifier)
    assert.deepEqual(Verifier.parse(rsa.did()).did(), rsa.did())
  })

  it('Verifier.or', async () => {
    const ed = await ed25519.generate()

    const Verifier = RSA.Verifier.or(ed25519.Verifier).or({
      parse(did) {
        return ed.verifier.withDID(did)
      },
    })

    const did = Verifier.parse('did:web:ucan.space')
    assert.deepEqual(did.did(), 'did:web:ucan.space')
    assert.deepEqual(did.toDIDKey(), ed.did())
  })

  it('Signer.or', async () => {
    const ed = await ed25519.generate()

    const Signer = RSA.or({
      /**
       * @param {API.SignerArchive<API.DIDKey, 0>} _archive
       */
      from(_archive) {
        throw new Error('Can not do it')
      },
    }).or(ed25519)

    const signer = Signer.from(ed.toArchive())
    assert.deepEqual(signer.did(), ed.did())
  })
})

import { ed25519, RSA, Verifier, Signer } from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'

export const utf8 = new TextEncoder()
describe('did', () => {
  it('generate', async () => {
    const key = await ed25519.generate()
    const signer = key.withDID('did:dns:api.web3.storage')

    assert.ok(signer.did().startsWith('did:dns:api.web3.storage'))
    assert.equal(signer.signatureCode, 0xd0ed)
    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signer, signer)

    const payload = await sha256.encode(new TextEncoder().encode('hello world'))
    const signature = await signer.sign(payload)

    assert.equal(
      await signer.verifier.verify(payload, signature),
      true,
      'signer can verify signature'
    )
    assert.equal(await signer.verify(payload, signature), true)

    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signatureCode, 0xd0ed)
    assert.equal(signer.did(), signer.verifier.did())
  })

  it('can archive 🔁 restore rsa unextractable', async () => {
    const key = await RSA.generate()
    const original = key.withDID('did:dns:api.web3.storage')
    const archive = original.toArchive()
    const restored = Signer.from(archive)
    const payload = utf8.encode('hello world')

    assert.equal(
      await restored.verify(payload, await original.sign(payload)),
      true
    )

    assert.equal(
      await original.verify(payload, await restored.sign(payload)),
      true
    )
  })

  it('can archive 🔁 restore rsa extractable', async () => {
    const key = await RSA.generate()
    const original = key.withDID('did:web:api.web3.storage')
    const archive = original.toArchive()
    const restored = Signer.from(archive)
    const payload = utf8.encode('hello world')

    assert.equal(
      await restored.verify(payload, await original.sign(payload)),
      true
    )

    assert.equal(
      await original.verify(payload, await restored.sign(payload)),
      true
    )
  })

  it('can archive 🔁 restore ed25519', async () => {
    const key = await ed25519.generate()
    const original = key.withDID('did:web:api.web3.storage')
    const restored = Signer.from(original.toArchive())
    const payload = utf8.encode('hello world')

    assert.equal(
      await restored.verify(payload, await original.sign(payload)),
      true
    )

    assert.equal(
      await original.verify(payload, await restored.sign(payload)),
      true
    )
  })

  it('fails to restore without resolvedDID', async () => {
    const key = await RSA.generate()
    const original = key.withDID('did:dns:api.web3.storage')
    const archive = original.toArchive()
    if (archive instanceof Uint8Array) {
      return assert.fail('Expected archive to be a SignerInfo')
    }
    const { id, keys } = archive

    assert.equal(id, 'did:dns:api.web3.storage')
    assert.equal(Object.keys(keys)[0].startsWith('did:key:'), true)
    assert.throws(() => Signer.from({ id, keys: {} }))
  })

  it('can sign & verify', async () => {
    const key = await ed25519.generate()
    const signer = key.withDID('did:web:web3.storage')
    const payload = utf8.encode('hello world')

    const signature = await signer.sign(payload)
    assert.equal(signature.code, signer.signatureCode)
    assert.equal(signature.algorithm, signer.signatureAlgorithm)

    const { verifier } = signer
    assert.equal(await verifier.verify(payload, signature), true)
    assert.equal(await signer.verify(payload, signature), true)
  })

  it('can parse verifier', async () => {
    const key = await ed25519.generate()
    const principal = key.withDID('did:dns:api.web3.storage')
    const payload = utf8.encode('hello world')
    const verifier = Verifier.parse(principal.did(), {
      resolveDID: async _dns => {
        return key.did()
      },
    })

    assert.equal(verifier.did(), 'did:dns:api.web3.storage')
    const signature = await principal.sign(payload)
    assert.equal(await verifier.verify(payload, signature), true)
    // checks that key was cached
    assert.equal(await verifier.verify(payload, signature), true)

    const v2 = verifier.withDID('did:web:api.web3.storage')
    assert.equal(v2.did(), 'did:web:api.web3.storage')
    assert.equal(await v2.verify(payload, signature), true)
  })

  it('fails to verify without resolver', async () => {
    const key = await ed25519.generate()
    const principal = key.withDID('did:dns:api.web3.storage')
    const payload = utf8.encode('hello world')
    const verifier = Verifier.parse('did:dns:api.web3.storage')
    const signature = await principal.sign(payload)

    assert.equal(await verifier.verify(payload, signature), false)
  })

  it('verifier can resolve', async () => {
    const key = await ed25519.generate()
    const { verifier } = key.withDID('did:web:api.web3.storage')

    assert.equal(verifier.did(), 'did:web:api.web3.storage')
  })

  it('verifier does not wrap if it is key', async () => {
    const key = await ed25519.generate()
    const verifier = Verifier.parse(key.did())

    assert.deepEqual(key.verifier, verifier)
  })

  it('can call withDID several times', async () => {
    const s = await ed25519.generate()
    const v = s.verifier
    const { keys } = s.toArchive()

    const s1 = s.withDID('did:test:s1')
    const v1 = v.withDID('did:test:v1')
    assert.deepEqual(s1.did(), 'did:test:s1')
    assert.deepEqual(v1.did(), 'did:test:v1')
    assert.deepEqual(s1.toArchive(), {
      id: 'did:test:s1',
      keys,
    })

    const s2 = s1.withDID('did:test:s2')
    const v2 = v1.withDID('did:test:v2')
    assert.deepEqual(s2.did(), 'did:test:s2')
    assert.deepEqual(v2.did(), 'did:test:v2')
    assert.deepEqual(s2.toArchive(), {
      id: 'did:test:s2',
      keys,
    })

    const s3 = s2.withDID('did:test:s3')
    const v3 = v2.withDID('did:test:v3')
    assert.deepEqual(s3.did(), 'did:test:s3')
    assert.deepEqual(v3.did(), 'did:test:v3')
    assert.deepEqual(s3.toArchive(), {
      id: 'did:test:s3',
      keys,
    })
  })
})

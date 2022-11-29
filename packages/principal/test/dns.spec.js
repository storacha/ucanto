import { ed25519, RSA, DNS } from '../src/lib.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'

export const utf8 = new TextEncoder()
describe('DNS', () => {
  it('generate', async () => {
    const signer = await DNS.generate('api.web3.storage', ed25519)

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
    const original = await DNS.generate('api.web3.storage', RSA)
    const archive = original.toArchive()
    const restored = DNS.from(archive)
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
    const original = await DNS.generate('api.web3.storage', RSA)
    const archive = original.toArchive()
    const restored = DNS.from(archive)
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
    const original = await DNS.generate('api.web3.storage', ed25519)
    const restored = DNS.from(original.toArchive())
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
    const original = await DNS.generate('api.web3.storage', RSA)
    const archive = original.toArchive()
    if (archive instanceof Uint8Array) {
      return assert.fail('Expected archive to be a SignerInfo')
    }
    const { resolvedDID, ...rest } = archive

    assert.equal(resolvedDID, original.resolve().did())
    assert.throws(() => DNS.from(rest), /resolvedDID/)
  })

  it('can sign & verify', async () => {
    const signer = await DNS.generate('web3.storage')
    const payload = utf8.encode('hello world')

    const signature = await signer.sign(payload)
    assert.equal(signature.code, signer.signatureCode)
    assert.equal(signature.algorithm, signer.signatureAlgorithm)

    const { verifier } = signer
    assert.equal(await verifier.verify(payload, signature), true)
    assert.equal(await signer.verify(payload, signature), true)
  })

  it('can parse verifier', async () => {
    const principal = await DNS.generate('api.web3.storage')
    const payload = utf8.encode('hello world')
    const verifier = DNS.Verifier.parse(principal.did(), {
      resolve: async _dns => {
        const verifier = await principal.resolve()
        return verifier.did()
      },
    })

    assert.equal(verifier.did(), 'did:dns:api.web3.storage')
    const signature = await principal.sign(payload)
    assert.equal(await verifier.verify(payload, signature), true)
    // checks that key was cached
    assert.equal(await verifier.verify(payload, signature), true)
  })

  it('fails to verify without resolver', async () => {
    const principal = await DNS.generate('api.web3.storage')
    const payload = utf8.encode('hello world')
    const verifier = DNS.parse('did:dns:api.web3.storage')
    const signature = await principal.sign(payload)

    assert.equal(await verifier.verify(payload, signature), false)
  })

  it('verifier can resolve', async () => {
    const keypair = await ed25519.generate()
    const { verifier, signer } = await DNS.generate('api.web3.storage', {
      generate: () => keypair,
    })

    assert.equal(verifier.resolve(), keypair.verifier)
    assert.equal(verifier.did(), 'did:dns:api.web3.storage')
  })
})

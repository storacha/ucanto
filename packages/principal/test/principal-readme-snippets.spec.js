import { assert } from 'chai'
import { ed25519 } from '../src/lib.js'

describe('principal README snippets', () => {
  it('key generation, sign, verify, and serialization example works', async () => {
    const payload = new Uint8Array([1, 2, 3])

    const keypair = await ed25519.generate()
    const signature = await keypair.sign(payload)
    const isValid = await keypair.verify(payload, signature)

    assert.equal(isValid, true)

    const exportable = await ed25519.generate({ extractable: true })
    const privateKey = ed25519.format(exportable)
    const parsed = ed25519.parse(privateKey)

    assert.equal(parsed.did(), exportable.did())
  })
})

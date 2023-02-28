import { Account } from '../src/lib.js'
import { assert } from 'chai'

export const utf8 = new TextEncoder()
describe('Account', async () => {
  it('it can sign', async () => {
    const account = Account.from({ id: 'did:mailto:web.mail:alice' })
    assert.deepEqual(account.did(), 'did:mailto:web.mail:alice')
    assert.deepEqual(account.signatureAlgorithm, '')
    assert.deepEqual(account.signatureCode, 0xd000)

    const signature = await account.sign(utf8.encode('hello world'))
    assert.deepEqual(signature.code, 0xd000)
    assert.deepEqual(signature.algorithm, '')
    assert.deepEqual(signature.raw, new Uint8Array())
  })
})

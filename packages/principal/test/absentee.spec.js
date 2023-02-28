import { Absentee } from '../src/lib.js'
import { assert } from 'chai'

export const utf8 = new TextEncoder()
describe('Absentee', async () => {
  it('it can sign', async () => {
    const absentee = Absentee.from({ id: 'did:mailto:web.mail:alice' })
    assert.deepEqual(absentee.did(), 'did:mailto:web.mail:alice')
    assert.deepEqual(absentee.signatureAlgorithm, '')
    assert.deepEqual(absentee.signatureCode, 0xd000)

    const signature = await absentee.sign(utf8.encode('hello world'))
    assert.deepEqual(signature.code, 0xd000)
    assert.deepEqual(signature.algorithm, '')
    assert.deepEqual(signature.raw, new Uint8Array())
  })
})

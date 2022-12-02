import { ed25519, RSA } from '../src/lib.js'

it('exports EdSigner interface', () => async () => {
  /**
   * @type {ed25519.Signer.EdSigner}
   */
  const _1 = await ed25519.generate()

  /**
   * @type {ed25519.Signer.EdSigner}
   */
  // @ts-expect-error - type mismatch
  const _2 = await RSA.generate()
})

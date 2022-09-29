import * as RSA from '../src/rsa.js'
import * as PrivateKey from '../src/rsa/private-key.js'
import * as PublicKey from '../src/rsa/public-key.js'
import * as PKCS8 from '../src/rsa/pkcs8.js'
import { assert } from 'chai'
import { sha256 } from 'multiformats/hashes/sha2'
import { varint } from 'multiformats'
import { webcrypto } from 'one-webcrypto'

export const utf8 = new TextEncoder()
describe('RSA', () => {
  it('can generate non extractabel keypair', async () => {
    const principal = await RSA.generate()

    assert.equal(principal.signatureCode, 0xd01205)
    assert.equal(principal.signatureAlgorithm, 'RS256')
    assert.match(principal.did(), /did:key:/)
    assert.equal(principal, principal.signer)

    assert.equal(typeof principal.toCryptoKey, 'function')
    assert.equal(typeof principal.export, 'undefined')
    assert.equal(typeof principal.verify, 'function')
    assert.equal(typeof principal.verifier.verify, 'function')
    assert.equal(principal.did(), principal.verifier.did())

    if (principal.toCryptoKey) {
      const key = await principal.toCryptoKey()
      assert.equal(key.algorithm.name, 'RSASSA-PKCS1-v1_5')
      assert.equal(key.extractable, false)
      assert.equal(key.type, 'private')
      assert.deepEqual(key.usages, ['sign'])
    }
  })

  it('can generate extractable keypair', async () => {
    const principal = await RSA.generate({ extractable: true })
    assert.equal(principal.signatureCode, 0xd01205)
    assert.equal(principal.signatureAlgorithm, 'RS256')
    assert.match(principal.did(), /did:key:/)
    assert.equal(principal, principal.signer)

    assert.equal(typeof principal.toCryptoKey, 'function')
    assert.equal(typeof principal.export, 'function')
    assert.equal(typeof principal.verify, 'function')
    assert.equal(typeof principal.verifier.verify, 'function')
    assert.equal(principal.did(), principal.verifier.did())

    if (!principal.toCryptoKey) {
      return assert.fail('expected to have toCryptoKey')
    }

    const key = await principal.toCryptoKey()
    assert.equal(key.algorithm.name, 'RSASSA-PKCS1-v1_5')
    assert.equal(key.extractable, true)
    assert.equal(key.type, 'private')
    assert.deepEqual(key.usages, ['sign'])

    if (!principal.export) {
      return assert.fail(`Expect key to be exportable`)
    }

    const bytes = await principal.export()
    assert.equal(bytes instanceof Uint8Array, true)
    assert.deepEqual([0x1305, 2], varint.decode(bytes))

    const signer = RSA.decode(bytes)
    const payload = utf8.encode('hello world')
    const signature = await signer.sign(payload)
    assert.equal(await principal.verify(payload, signature), true)
  })

  it('can sign & verify', async () => {
    const principal = await RSA.generate()
    const payload = utf8.encode('hello world')

    const signature = await principal.sign(payload)
    assert.equal(signature.code, principal.signatureCode)
    assert.equal(signature.algorithm, principal.signatureAlgorithm)

    const { verifier } = principal
    assert.equal(await verifier.verify(payload, signature), true)

    assert.equal(await principal.verify(payload, signature), true)
  })

  it('can parse verifier', async () => {
    const principal = await RSA.generate()
    const payload = utf8.encode('hello world')
    const verifier = RSA.Verifier.parse(principal.did())

    const signature = await principal.sign(payload)
    assert.equal(await verifier.verify(payload, signature), true)
  })

  it('can export / import', async () => {
    const original = await RSA.generate({ extractable: true })
    if (!original.export) {
      assert.fail('must have export')
    }

    const bytes = await original.export()
    const imported = RSA.decode(bytes)
    const payload = utf8.encode('hello world')

    {
      const signature = await original.sign(payload)
      assert.equal(await imported.verifier.verify(payload, signature), true)
    }

    {
      const signature = await imported.sign(payload)
      assert.equal(await original.verifier.verify(payload, signature), true)
    }
  })

  it('can parse', async () => {
    const did =
      'did:key:z4MXj1wBzi9jUstyPMS4jQqB6KdJaiatPkAtVtGc6bQEQEEsKTic4G7Rou3iBf9vPmT5dbkm9qsZsuVNjq8HCuW1w24nhBFGkRE4cd2Uf2tfrB3N7h4mnyPp1BF3ZttHTYv3DLUPi1zMdkULiow3M1GfXkoC6DoxDUm1jmN6GBj22SjVsr6dxezRVQc7aj9TxE7JLbMH1wh5X3kA58H3DFW8rnYMakFGbca5CB2Jf6CnGQZmL7o5uJAdTwXfy2iiiyPxXEGerMhHwhjTA1mKYobyk2CpeEcmvynADfNZ5MBvcCS7m3XkFCMNUYBS9NQ3fze6vMSUPsNa6GVYmKx2x6JrdEjCk3qRMMmyjnjCMfR4pXbRMZa3i'

    const verifier = RSA.Verifier.parse(did)
    assert.deepEqual(verifier.did(), did)

    const payload = utf8.encode('hello world')
    const signer = await RSA.generate({ extractable: true })
    const signature = await signer.sign(payload)

    assert.equal(await verifier.verify(payload, signature), false)
  })
})

/**
 * @param {Exclude<KeyFormat, "jwk">} format
 * @param {{toCryptoKey?: () => PromiseLike<CryptoKey>|CryptoKey}} key
 */
const exportKey = async (format, key) => {
  if (!key.toCryptoKey) {
    assert.fail()
  }
  const cryptoKey = await key.toCryptoKey()
  return webcrypto.subtle.exportKey(format, cryptoKey)
}

describe('PrivateKey', () => {
  it('PublicKey fromSPKI 🔁 toSPKI', async () => {
    const { verifier } = await RSA.generate()
    const spki = new Uint8Array(await exportKey('spki', verifier))
    const key = PublicKey.fromSPKI(spki)
    assert.deepEqual(spki, PublicKey.toSPKI(key))
  })

  it.only('PKCS8 decode 🔁 encode', async () => {
    const { signer } = await RSA.generate({ extractable: true })
    const expected = new Uint8Array(await exportKey('pkcs8', signer))
    const key = PKCS8.decode(expected)
    const actual = PKCS8.encode(key)

    assert.deepEqual(actual, expected)
  })

  it.only('PrivateKey decode 🔁 encode', async () => {
    const { signer } = await RSA.generate({ extractable: true })
    const pkcs8 = new Uint8Array(await exportKey('pkcs8', signer))
    const source = PKCS8.decode(pkcs8)

    const key = PrivateKey.decode(source)
    const bytes = PrivateKey.encode(key)

    assert.deepEqual(source, bytes)
  })

  it('PrivateKey fromPKCS8 🔁 toPKCS8', async () => {
    const { signer } = await RSA.generate({ extractable: true })
    const pkcs8 = new Uint8Array(await exportKey('pkcs8', signer))
    const key = PrivateKey.fromPKCS8(pkcs8)
    const info = PrivateKey.toPKCS8(key)
    assert.deepEqual(info, pkcs8)
  })
})

// describe('RSA codec', () => {
//   it('public key roundtrips', () => {
//     const expect = new TextEncoder().encode('my secret code')
//     const info = RSA.fromRSAPublicKey(expect)
//     const actual = RSA.toRSAPublicKey(info)
//     assert.deepEqual(actual, expect)
//   })
//   it('private key roundtrips', () => {
//     const expect = new TextEncoder().encode('my secret code')
//     const info = RSA.fromRSAPrivateKey(expect)
//     const actual = RSA.toRSAPrivateKey(info)
//     assert.deepEqual(actual, expect)
//   })
//   /**
//    * @param {Exclude<KeyFormat, "jwk">} format
//    * @param {{toCryptoKey?: () => PromiseLike<CryptoKey>|CryptoKey}} key
//    */
//   const exportKey = async (format, key) => {
//     if (!key.toCryptoKey) {
//       assert.fail()
//     }
//     const cryptoKey = await key.toCryptoKey()
//     return webcrypto.subtle.exportKey(format, cryptoKey)
//   }
//   it.only('PublicKey fromSPKI 🔁 toSPKI', async () => {
//     const { verifier } = await RSA.generate()
//     const spki = new Uint8Array(await exportKey('spki', verifier))
//     const key = PublicKey.fromSPKI(spki)
//     assert.deepEqual(spki, PublicKey.toSPKI(key))
//   })
// })

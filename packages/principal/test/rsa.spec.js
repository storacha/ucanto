import * as RSA from '../src/rsa.js'
import * as PrivateKey from '../src/rsa/private-key.js'
import * as PublicKey from '../src/rsa/public-key.js'
import * as PKCS8 from '../src/rsa/pkcs8.js'
import * as multiformat from '../src/multiformat.js'
import { assert } from 'chai'
import { varint } from 'multiformats'
import { webcrypto } from 'one-webcrypto'

export const utf8 = new TextEncoder()
describe('RSA', () => {
  it('can generate non extractabel keypair', async () => {
    const signer = await RSA.generate()

    assert.equal(signer.code, 0x1305)
    assert.equal(signer.signatureCode, 0xd01205)
    assert.equal(signer.signatureAlgorithm, 'RS256')
    assert.match(signer.did(), /did:key:/)
    assert.equal(typeof signer.toArchive, 'function')
    assert.equal(typeof signer.verify, 'function')
    assert.equal(typeof signer.sign, 'function')

    assert.equal(signer.signer, signer)

    const { verifier } = signer
    assert.equal(typeof verifier.verify, 'function')
    assert.equal(verifier.code, 0x1205)
    assert.equal(verifier.signatureCode, 0xd01205)
    assert.equal(verifier.signatureAlgorithm, 'RS256')
    assert.equal(verifier.did(), signer.did())

    const { key, did } = /** @type {RSA.SignerInfo} */ (signer.toArchive())
    assert.equal(did, signer.did())
    assert.equal(key.type, 'private')
    assert.deepEqual(Object(key.algorithm), {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: {
        name: 'SHA-256',
      },
    })
    assert.equal(key.extractable, false)
    assert.deepEqual(key.usages, ['sign'])
  })

  it('can archive 🔁 restore unextractable', async () => {
    const original = await RSA.generate()
    const bytes = original.toArchive()
    const restored = RSA.from(bytes)
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

  it('can generate extractable keypair', async () => {
    const signer = await RSA.generate({ extractable: true })
    assert.equal(signer.signatureCode, 0xd01205)
    assert.equal(signer.signatureAlgorithm, 'RS256')
    assert.match(signer.did(), /did:key:/)
    assert.equal(signer, signer.signer)
    assert.equal(typeof signer.toArchive, 'function')
    assert.equal(typeof signer.sign, 'function')
    assert.equal(typeof signer.verify, 'function')

    assert.equal(signer.signer, signer)

    const { verifier } = signer
    assert.equal(typeof verifier.verify, 'function')
    assert.equal(verifier.code, 0x1205)
    assert.equal(verifier.signatureCode, 0xd01205)
    assert.equal(verifier.signatureAlgorithm, 'RS256')
    assert.equal(verifier.did(), signer.did())

    const bytes = signer.toArchive()
    if (!(bytes instanceof Uint8Array)) {
      return assert.fail()
    }
    assert.deepEqual([0x1305, 2], varint.decode(bytes))

    /** @type {CryptoKey} */
    // @ts-expect-error - field is private
    const privateKey = signer.privateKey
    assert.equal(privateKey.type, 'private')
    assert.deepEqual(Object(privateKey.algorithm), {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: {
        name: 'SHA-256',
      },
    })
    assert.equal(privateKey.extractable, true)
    assert.deepEqual(privateKey.usages, ['sign'])
  })

  it('can archive 🔁 restore extractable', async () => {
    const original = await RSA.generate({ extractable: true })
    const restored = RSA.from(original.toArchive())
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

  it('can sign & verify', async () => {
    const signer = await RSA.generate()
    const payload = utf8.encode('hello world')

    const signature = await signer.sign(payload)
    assert.equal(signature.code, signer.signatureCode)
    assert.equal(signature.algorithm, signer.signatureAlgorithm)

    const { verifier } = signer
    assert.equal(await verifier.verify(payload, signature), true)
    assert.equal(await signer.verify(payload, signature), true)
  })

  it('can parse verifier', async () => {
    const principal = await RSA.generate()
    const payload = utf8.encode('hello world')
    const verifier = RSA.Verifier.parse(principal.did())

    const signature = await principal.sign(payload)
    assert.equal(await verifier.verify(payload, signature), true)
  })

  it('can format / parse verifier', async () => {
    const { signer, verifier: original } = await RSA.generate()

    const did = await original.did()
    const parsed = RSA.Verifier.parse(did)
    const payload = utf8.encode('hello world')

    const signature = await signer.sign(payload)
    assert.equal(await original.verify(payload, signature), true)
    assert.equal(await parsed.verify(payload, signature), true)
    assert.deepEqual(did, await parsed.did())
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

  it('can not verify other signatures', async () => {
    const signer = await RSA.generate()
    const payload = utf8.encode('hello world')
    const signature = await signer.sign(payload)

    assert.equal(await signer.verify(payload, signature), true)

    assert.equal(
      await signer.verify(payload, {
        ...signature,
        // @ts-expect-error
        code: signature.code + 1,
      }),
      false
    )
  })
})

/**
 * @param {Exclude<KeyFormat, "jwk">} format
 * @param {RSA.RSASigner|RSA.RSAVerifier} principal
 */
const exportKey = async (format, principal) => {
  // @ts-expect-error - accessing private keys
  const cryptoKey = principal.privateKey || principal.publicKey
  return webcrypto.subtle.exportKey(format, cryptoKey)
}

describe('PrivateKey', () => {
  it('PublicKey fromSPKI 🔁 toSPKI', async () => {
    const { verifier } = await RSA.generate()
    const spki = new Uint8Array(await exportKey('spki', verifier))
    const key = PublicKey.fromSPKI(spki)
    assert.deepEqual(spki, PublicKey.toSPKI(key))
  })

  it('PKCS8 decode 🔁 encode', async () => {
    const { signer } = await RSA.generate({ extractable: true })
    const expected = new Uint8Array(await exportKey('pkcs8', signer))
    const key = PKCS8.decode(expected)
    const actual = PKCS8.encode(key)

    assert.deepEqual(actual, expected)
  })

  it('PrivateKey decode 🔁 encode', async () => {
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

it('multiformat', () => {
  const value = multiformat.tagWith(
    5,
    multiformat.tagWith(4, new Uint8Array([1, 1, 1]))
  )

  const outer = multiformat.untagWith(5, value)
  assert.deepEqual(
    {
      buffer: value.buffer,
      byteOffset: 1,
      byteLength: value.byteLength - 1,
    },
    {
      buffer: outer.buffer,
      byteOffset: outer.byteOffset,
      byteLength: outer.byteLength,
    }
  )
  assert.deepEqual(outer, value.subarray(1))

  const inner = multiformat.untagWith(4, value, 1)
  assert.deepEqual(
    {
      buffer: value.buffer,
      byteOffset: 2,
      byteLength: value.byteLength - 2,
    },
    {
      buffer: inner.buffer,
      byteOffset: inner.byteOffset,
      byteLength: inner.byteLength,
    }
  )
  assert.deepEqual(inner, value.subarray(2))

  assert.throws(
    () => multiformat.untagWith(3, value),
    /Expected multiformat with 0x3 tag instead got 0x5/
  )
})

it('toJWK 🔁 fromJWK', async () => {
  const { signer, verifier } = await RSA.generate({ extractable: true })

  /** @type {CryptoKeyPair} */
  const keyPair = {
    // @ts-expect-error - accessing private field
    privateKey: signer.privateKey,
    // @ts-expect-error - accessing private field
    publicKey: verifier.publicKey,
  }

  const jwk = await webcrypto.subtle.exportKey('jwk', keyPair.privateKey)

  const privateKey = PrivateKey.decode(
    multiformat.untagWith(
      RSA.code,
      /** @type {Uint8Array} */ (signer.toArchive())
    )
  )

  assert.deepEqual(PrivateKey.fromJWK(jwk), privateKey)
  assert.deepEqual(PrivateKey.toJWK(PrivateKey.fromJWK(jwk)), jwk)

  assert.deepEqual(
    PublicKey.toJWK(privateKey),
    await webcrypto.subtle.exportKey('jwk', keyPair.publicKey)
  )

  const publicKey = PublicKey.decode(
    multiformat.untagWith(
      signer.verifier.code,
      // @ts-expect-error - accessing private property
      signer.verifier.bytes
    )
  )

  assert.deepEqual(PublicKey.fromJWK(jwk), publicKey)
  assert.deepEqual(PublicKey.fromJWK(PublicKey.toJWK(publicKey)), publicKey)
  assert.deepEqual(PublicKey.fromJWK(PublicKey.toJWK(privateKey)), publicKey)
})

it('toSPKI 🔁 fromSPKI', async () => {
  const signer = await RSA.generate({ extractable: true })
  const spki = new Uint8Array(await exportKey('spki', signer.verifier))

  const privateKey = PrivateKey.decode(
    multiformat.untagWith(
      RSA.code,
      /** @type {Uint8Array} */ (signer.toArchive())
    )
  )

  assert.deepEqual(PrivateKey.toSPKI(privateKey), spki)
})

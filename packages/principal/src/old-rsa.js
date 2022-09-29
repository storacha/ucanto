import { configure } from './web/signer.js'

const ALG = 'RSASSA-PKCS1-v1_5'

export const {
  code,
  signatureCode,
  signatureAlgorithm,
  Verifier,
  importKeyPair,
  generateKey,
} = configure({
  signerCode: 0x1305,
  verifierCode: 0x1205,
  signatureCode: 0xd01205,
  signatureAlgorithm: 'RS256',
  genParams: {
    name: ALG,
    modulusLength: 2048,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: 'SHA-256' },
  },
  signParams: {
    name: ALG,
    saltLength: 128,
  },
  importParams: {
    name: ALG,
    hash: { name: 'SHA-256' },
  },
})

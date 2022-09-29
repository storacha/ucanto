import { configure } from './web/verifier.js'

export const ALG = 'ECDSA'

export const {
  code,
  signatureCode,
  signatureAlgorithm,
  encode,
  decode,
  parse,
  format,
} = configure({
  code: 0x1202,
  signatureCode: 0xd01202,
  signatureAlgorithm: 'ES512',
  signParams: {
    name: ALG,
    hash: { name: 'SHA-256' },
  },
  importParams: {
    name: ALG,
    namedCurve: 'P-512',
  },
})

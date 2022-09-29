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
  code: 0x1201,
  signatureCode: 0xd01201,
  signatureAlgorithm: 'ES384',
  signParams: {
    name: ALG,
    hash: { name: 'SHA-256' },
  },
  importParams: {
    name: ALG,
    namedCurve: 'P-384',
  },
})

import { configure } from './web/verifier.js'

const ALG = 'ECDSA'

export const {
  code,
  signatureCode,
  signatureAlgorithm,
  decode,
  encode,
  parse,
  format,
} = configure({
  code: 0x1200,
  signatureCode: 0xd01200,
  signatureAlgorithm: 'ES256',
  signParams: { name: ALG, hash: { name: 'SHA-256' } },
  importParams: { name: ALG, namedCurve: 'P-256' },
})

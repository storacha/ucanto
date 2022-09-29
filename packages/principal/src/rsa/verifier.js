import * as API from '@ucanto/interface'
import { base58btc } from 'multiformats/bases/base58'
import { webcrypto } from 'one-webcrypto'
import { varint } from 'multiformats'
import { RS256 } from '@ipld/dag-ucan/signature'
import * as DID from '@ipld/dag-ucan/did'
import { define } from '../web/signer.js'

export const RSA_ALG = 'RSASSA-PKCS1-v1_5'
export const SALT_LEGNTH = 128

export const name = 'RSA'

export const {
  encode,
  decode,
  format,
  parse,
  code,
  signatureCode,
  signatureAlgorithm,
} = define({
  code: 0x1205,
  signatureCode: RS256,
  signatureAlgorithm: /** @type {'RS256'} */ ('RS256'),
  signParams: { name: RSA_ALG, saltLength: SALT_LEGNTH },
})

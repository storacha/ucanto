import * as API from '@ucanto/interface'
import * as Codec from './codec.js'
import * as CAR from './car.js'
import { encode as encodeCBOR } from '@ucanto/core/cbor'

export const CBOR = {
  /**
   * Encodes receipts into a legacy CBOR representation.
   *
   * @template {API.Tuple<API.Receipt>} I
   * @param {I} receipts
   * @param {API.EncodeOptions} [options]
   * @returns {API.HTTPResponse<I>}
   */
  encode(receipts, options) {
    const legacyResults = []
    for (const receipt of receipts) {
      const result = receipt.out
      if (result.ok) {
        legacyResults.push(result.ok)
      } else {
        legacyResults.push({
          ...result.error,
          error: true,
        })
      }
    }
    return /** @type {API.HTTPResponse<I>} */ ({
      headers: { 'content-type': 'application/cbor' },
      body: encodeCBOR(legacyResults),
    })
  },
}

export const inbound = Codec.inbound({
  decoders: {
    'application/car': CAR.request,
  },
  encoders: {
    '*/*;q=0.1': CBOR,
    'application/car': CAR.response,
  },
})

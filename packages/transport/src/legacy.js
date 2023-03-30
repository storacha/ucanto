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

/**
 * This is an inbound codec designed to support legacy clients and encode
 * responses in a legacy (CBOR) format.
 */
export const inbound = Codec.inbound({
  decoders: {
    'application/car': CAR.request,
  },
  encoders: {
    // Here we configure encoders such that if accept header is `*/*` (which is
    // the default if omitted) we will encode the response in CBOR. If
    // `application/car` is set we will encode the response in current format
    // is CAR.
    // Here we exploit the fact that legacy clients do not send an accept header
    // and therefore will get response in legacy format. New clients on the other
    // hand will send `application/car` and consequently get response in current
    // format.
    '*/*;q=0.1': CBOR,
    'application/car': CAR.response,
  },
})

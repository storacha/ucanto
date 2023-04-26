import * as Codec from './codec.js'
import * as CAR from './car.js'
import * as response from './legacy/response.js'
import * as request from './legacy/request.js'

export const { contentType } = request
export { request, response }

/**
 * This is an inbound codec designed to support legacy clients and encode
 * responses in a legacy (CBOR) format.
 */
export const inbound = Codec.inbound({
  decoders: {
    [contentType]: request,
    [CAR.contentType]: CAR.request,
  },
  encoders: {
    // Here we configure encoders such that if accept header is `*/*` (which is
    // the default if omitted) we will encode the response in CBOR. If
    // `application/vnd.ipld.car` is set we will encode the response in current
    // format.
    // Here we exploit the fact that legacy clients do not send an accept header
    // and therefore will get response in legacy format. New clients on the other
    // hand will send `application/vnd.ipld.car` and consequently get response
    // in current format.
    '*/*;q=0.1': response,
    [CAR.contentType]: CAR.response,
  },
})

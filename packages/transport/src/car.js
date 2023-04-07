import { CAR } from '@ucanto/core'
import * as request from './car/request.js'
import * as response from './car/response.js'
import * as Codec from './codec.js'

export { CAR as codec, request, response }

export const contentType = CAR.contentType

export const inbound = Codec.inbound({
  decoders: {
    [request.contentType]: request,
  },
  encoders: {
    [response.contentType]: response,
  },
})

export const outbound = Codec.outbound({
  encoders: {
    [request.contentType]: request,
  },
  decoders: {
    [response.contentType]: response,
  },
})

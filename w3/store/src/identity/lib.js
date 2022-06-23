export * from './capability.js'
import * as Provider from './provider.js'
import * as API from '../type.js'
import { SigningAuthority, Authority } from '@ucanto/authority'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import webfetch from '@web-std/fetch'

/**
 * @param {object} options
 * @param {string} options.keypair
 * @param {Provider.DB} [options.db]
 * @return {API.ConnectionView<{identity: API.Identity.Identity}>}
 */
export const create = ({ keypair, db = new Map() }) => {
  const id = SigningAuthority.parse(keypair)
  const service = Provider.create({
    id,
    db,
  })

  const server = Server.create({
    id,
    service,
    encoder: CBOR,
    decoder: CAR,
  })

  return Client.connect({
    id: id.authority,
    encoder: CAR,
    decoder: CBOR,
    channel: server,
  })
}

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 * @returns {API.ConnectionView<{identity: API.Identity.Identity}>}
 */
export const connect = ({
  id,
  url,
  transport = { encoder: CAR, decoder: CBOR },
  fetch = webfetch,
  method,
}) =>
  Client.connect({
    id: Authority.parse(id),
    ...transport,
    channel: HTTP.open({
      url,
      fetch,
      method,
    }),
  })

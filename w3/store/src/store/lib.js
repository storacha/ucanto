import * as Service from './service.js'
import { SigningAuthority, Authority } from '@ucanto/authority'
export * from './capability.js'
import * as API from '../type.js'
import * as Provider from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import webfetch from '@web-std/fetch'
import * as Client from '@ucanto/client'

/**
 * @param {object} options
 * @param {string} options.keypair
 * @param {API.ConnectionView<{identity: API.Identity.Identity}>} options.identity
 * @param {API.Accounting.Provider} options.accounting
 * @param {API.SignOptions} options.signingOptions
 * @param {API.InboundTransportOptions} [options.transport]
 * @param {API.ValidatorOptions} [options.validator]
 */
export const create = ({
  keypair,
  identity,
  accounting,
  signingOptions,
  transport = { decoder: CAR, encoder: CBOR },
  validator = {},
}) => {
  const id = SigningAuthority.parse(keypair)
  const service = Service.create({
    id,
    identity,
    accounting,
    signingOptions,
  })

  const provider = Provider.create({
    ...transport,
    ...validator,
    id: id.authority,
    service,
  })

  return Object.assign(provider, {
    handleRequest: provider.request.bind(provider),
  })
}

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 * @returns {API.ConnectionView<{store: API.Store.Store, identity: API.Identity.Identity }>}
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

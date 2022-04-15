import * as API from '../../api.js'
import * as Invoke from '../invoke.js'
import * as Transport from './api.js'
import { pack, upnack } from './util.js'
import * as CAR from '../../car.js'
import * as UCAN from '@ipld/dag-ucan'

const HEADERS = Object.freeze({
  'content-type': 'application/car',
})

/**
 * @template {API.IssuedInvocation[]} I
 * @param {API.Batch<I>} bundle
 * @returns {Promise<Transport.HTTPRequest<I>>}
 */
export const encode = async (bundle) => {
  const { invocations, delegations } = await Invoke.pack(bundle)
  const body = CAR.encode({ roots: invocations, blocks: delegations.values() })

  return {
    headers: HEADERS,
    body,
  }
}

/**
 * @template {API.Invocation[]} Invocations
 * @param {Transport.HTTPRequest<Invocations>} request
 * @returns {Promise<API.Batch<Invocations>>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers['content-type'] || headers['Content-Type']
  if (contentType !== 'application/car') {
    throw TypeError(
      `Only 'content-type: application/car' is supported, intsead got '${contentType}'`
    )
  }

  const { roots, blocks } = await CAR.decode(body)
  const delegations = new Map()
  /** @type {Transport.Block[]} */
  const invocations = []

  for (const { cid, bytes } of blocks) {
    delegations.set(cid.toString(), {
      cid,
      bytes,
      data: UCAN.decode(bytes),
    })
  }

  for (const { cid, bytes } of roots) {
    invocations.push({
      cid: /** @type {UCAN.Proof<any, any>} */ (cid),
      bytes,
      data: UCAN.decode(bytes),
    })
  }

  return Invoke.unpack({ invocations, delegations })
}

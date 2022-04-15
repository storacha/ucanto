import * as UCAN from '@ipld/dag-ucan'
import { CarReader } from '@ipld/car/reader'
import * as CAR from './car.js'
import * as CBOR from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Service from './service.js'

export * from './service.js'
export { Service }

/**
 * @template T
 * @template {Service.Query<T>} Input
 * @implements {Service.UCANQuery<T, Input>}
 */
class Query {
  /**
   * @param {Service.Connection<T>} connection
   * @param {Input} input
   */
  constructor(connection, input) {
    this.input = input
    this.connection = connection
  }

  encode() {
    return encodeQuery(this)
  }

  /**
   * @param {Uint8Array} bytes
   */
  static async decode(bytes) {
    const reader = await CarReader.fromBytes(bytes)
    const [root] = await reader.getRoots()
    const head = await reader.get(root)
    if (head) {
      const response = CBOR.decode(head.bytes)
    }
  }

  /**
   *
   * @param {URL} url
   * @returns
   */
  async post(url) {
    const response = await fetch(url.href, {
      method: 'POST',
      body: await this.encode(),
    })

    const bytes = new Uint8Array(await response.arrayBuffer())
    return Query.decode(bytes)
  }

  /**
   *
   * @param {{url: URL}} context
   * @returns {Promise<Service.Result<Input, T>>}
   */
  async execute({ url }) {
    throw 0
  }

  /**
   * @template S
   * @template {Service.Query<S>} Input
   * @param {Input} input
   * @param {string[]} path
   * @returns {IterableIterator<{invocation: UCAN.UCANOptions, selector:object}>}
   */
  static *iterate(input, path = []) {
    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value) && value.length === 2) {
        const [input, selector] = value
        const { issuer, audience, proofs, ...query } = input
        const capabilities = [
          {
            ...query,
            can: [...path, key].join('/'),
          },
        ]
        const invocation = {
          issuer,
          audience,
          capabilities,
          proofs,
        }

        yield { invocation, selector }
      } else {
        yield* Query.iterate(value, [...path, key])
      }
    }
  }
}

/**
 * @template T
 * @template {Service.Query<T>} Input
 * @param {UCAN.ByteView<Service.Payload<Input>>} bytes
 */
export const decodeQuery = async (bytes) => {
  const car = await CarReader.fromBytes(bytes)
  const roots = await car.getRoots()
  if (roots.length != 1) {
    throw new RangeError('Only single root CARs are supported right now')
  }
  const [cid] = roots
  const root = await car.get(cid)
  if (!root) {
    throw new RangeError(`CAR mus conain a root block`)
  }

  /** @type {Service.Payload<Input>} */
  const payload = CBOR.decode(root.bytes)

  return new QueryDecoder(payload, car)
}

/**
 * @template T
 * @template {Service.Query<T>} Input
 */
class QueryDecoder {
  /**
   * @param {Service.Payload<Input>} payload
   * @param {CarReader} reader
   */
  constructor(payload, reader) {
    this.payload = payload
    this.reader = reader
  }

  /**
   * @param {T} service
   */
  execute(service) {
    return executeQuery(service, this.payload, this.reader, [])
  }
}

/**
 * @template T
 * @template {Service.Query<T>} Input
 * @template {Service.Payload<Input>} Payload
 * @param {T} service
 * @param {Payload} payload
 * @param {CarReader} reader
 * @param {string[]} path
 * @returns {Promise<Service.Result<Input, T>>}
 */
export const executeQuery = async (service, payload, reader, path) => {
  const result = /** @type {Service.Result<Input, T>} */ ({})
  /** @type {Promise<undefined>[]} */
  const promises = []
  executeQueryWith(service, payload, reader, path, result, promises)
  await Promise.all(promises)
  return result
}

/**
 * @template T
 * @template {Service.Query<T>} Input
 * @template {Service.Payload<Input>} Payload
 * @param {T} service
 * @param {Payload} payload
 * @param {CarReader} reader
 * @param {string[]} path
 * @param {Record<string, any>} result
 * @param {Promise<undefined>[]} promises
 */
export const executeQueryWith = (
  service,
  payload,
  reader,
  path,
  result = {},
  promises = []
) => {
  for (const [key, value] of Object.entries(payload)) {
    const name = /** @type {keyof Payload & keyof T} */ (key)
    if (isRequest(value)) {
      const [cid, selector] = value
      const promise = executeInvocation(
        service,
        cid,
        selector,
        reader,
        result,
        name
      )
      promises.push(promise)
    } else {
      const subservice = service[name]

      executeQueryWith(
        subservice,
        value,
        reader,
        [...path, String(name)],
        (result[name] = {}),
        promises
      )
    }
  }
}

/**
 * @template {UCAN.Capability} Input
 * @template Out
 * @template {Service.Selector<Out>} Selector
 * @template {string} Name
 * @param {{[Key in Name]:(input:Input) => Promise<Out>}} service
 * @param {UCAN.Proof} cid
 * @param {Selector} selector
 * @param {CarReader} reader
 * @param {{[Key in Name]: {ok: true, value: Out}|{ok:false, error:Error}}} result
 * @param {Name} name
 * @returns {Promise<void>}
 */
export const executeInvocation = async (
  service,
  cid,
  selector,
  reader,
  result,
  name
) => {
  try {
    const block = await reader.get(/** @type {CID} */ (cid))
    if (block == null) {
      throw new TypeError(
        `CAR must contain all queries but it is missing block for ${cid}`
      )
    }

    /** @type {UCAN.View<Input>} */
    const ucan = UCAN.decode(block.bytes)
    const { capabilities } = ucan
    if (capabilities.length != 1) {
      throw new TypeError(
        `UCAN query invocation may only contain single capability`
      )
    }

    const [input] = capabilities
    const value = await service[name](input, ucan)
    // @ts-ignore
    result[name] = { ok: true, value: select(selector, value) }
  } catch (error) {
    result[name] = { ok: false, error: /** @type {Error} */ (error) }
  }
}

/**
 * @template {Record<PropertyKey, unknown>} T
 * @template {Service.Selector<T>} Selector
 * @param {Selector} selector
 * @param {T} source
 * @returns {Service.Select<Selector, T>}
 */

const select = (selector, source) => {
  const match = /** @type {Service.Select<Selector, T>} */ ({})
  for (const [key, value] of Object.entries(selector)) {
    const name = /** @type {keyof T & keyof Service.Select<Selector, T>} */ (
      key
    )

    match[name] =
      value === true
        ? source[key]
        : select(/** @type {any} */ (value), /** @type {any} */ (source[key]))
  }
  return match
}

/**
 * @template T
 * @template {Service.Query<T>} Input
 * @param {Service.UCANQuery<T, Input>} query
 */

export const encodeQuery = async ({ input }) => {
  const encoder = CAR.createWriter()
  const query = await encodeQueryInto(input, encoder, [])
  const bytes = CBOR.encode(query)
  const cid = CID.createV1(UCAN.code, await sha256.digest(bytes))
  const car = encoder.flush({ cid, bytes })
  return car
}

/**
 * @template {unknown} T
 * @template {Service.Query<T>} Input
 * @param {Service.PacketEncoder} encoder
 * @param {string[]} path
 * @param {Input} input
 * @returns {Promise<Service.Payload<Input>>}
 */

const encodeQueryInto = async (input, encoder, path) => {
  const query = /** @type {Record<keyof input, any>} */ ({})
  for (const [key, value] of Object.entries(input)) {
    const name = /** @type {keyof Input} */ (key)
    if (isInvocation(value)) {
      const [{ issuer, audience, proofs, ...action }, selector] = value
      const ucan = await UCAN.issue({
        issuer,
        audience: audience.did(),
        capabilities: [
          {
            ...action,
            can: `${path.join('/')}/${name}`,
          },
        ],
        proofs,
      })

      const bytes = UCAN.encode(ucan)
      const block = {
        cid: CID.createV1(UCAN.code, await sha256.digest(bytes)),
        bytes,
      }
      encoder.write(block)

      query[name] = [block.cid, selector]
    } else {
      query[name] = await encodeQueryInto(value, encoder, [
        ...path,
        String(name),
      ])
    }
  }
  return query
}

/**
 * @template {UCAN.Capability} In
 * @template {unknown} Out
 * @param {unknown} input
 * @returns {input is [Service.Invocation<In>, Service.Selector<Out>]}
 */

const isInvocation = (input) => Array.isArray(input) && input.length === 2

/**
 * @template {UCAN.Capability} In
 * @template {unknown} Out
 * @param {unknown} input
 * @returns {input is [UCAN.Proof<In>, Service.Selector<Out>]}
 */

const isRequest = (input) => Array.isArray(input) && input.length === 2

/**
 * @template T
 * @template {Service.Query<T>} Input
 * @param {Service.Connection<T>} connection
 * @param {Input} input
 * @returns {Service.UCANQuery<T, Input>}
 */
export const query = (connection, input) => new Query(connection, input)

/**
 * @template T
 * @returns {Service.Connection<T>}
 */
export const open = () => ({})

// /**
//  * @template T
//  * @template {UCAN.Capability} E
//  * @template {Service.Input<T>} Input
//  * @param {Service.Connection<T>} config
//  * @param {Input} input
//  * @param {UCAN.Link<UCAN.UCAN<E>>[]} [proofs]
//  * @returns {Service.Output<T, Input['can']>}
//  */
// const invoke = (config, input, proofs = []) => {
//   return {
//     audience: config.audience.toString(),
//     issuer: config.issuer,
//     lifetimeInSeconds: 1000,
//     proofs,
//     capabilities: [/** @type {any} */ (input)],
//   }
// }

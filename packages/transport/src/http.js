import * as API from '@ucanto/interface'

/**
 * @typedef {{
 * ok: boolean
 * arrayBuffer():API.Await<ArrayBuffer>
 * headers: {
 *  entries?: () => Iterable<[string, string]>
 * } | Headers
 * status?: number
 * statusText?: string
 * url?: string
 * }} FetchResponse
 * @typedef {(url:string, init:API.HTTPRequest) => API.Await<FetchResponse>} Fetcher
 */
/**
 * @template S
 * @param {object} options
 * @param {URL} options.url
 * @param {(url:string, init:API.HTTPRequest) => API.Await<FetchResponse>} [options.fetch]
 * @param {string} [options.method]
 * @param {Record<string, string>} [options.headers]
 * @returns {API.Channel<S>}
 */
export const open = ({ url, method = 'POST', fetch, headers }) => {
  /* c8 ignore next 9 */
  if (!fetch) {
    if (typeof globalThis.fetch !== 'undefined') {
      fetch = globalThis.fetch.bind(globalThis)
    } else {
      throw new TypeError(
        `ucanto HTTP transport got undefined \`fetch\`. Try passing in a \`fetch\` implementation explicitly.`
      )
    }
  }
  return new Channel({ url, method, fetch, headers })
}

/**
 * @template {Record<string, any>} S
 * @implements {API.Channel<S>}
 */
class Channel {
  /**
   * @param {object} options
   * @param {URL} options.url
   * @param {Fetcher} options.fetch
   * @param {string} [options.method]
   * @param {Record<string, string>} [options.headers]
   */
  constructor({ url, fetch, method, headers }) {
    this.fetch = fetch
    this.method = method
    this.url = url
    this.headers = headers
  }
  /**
   * @template {API.Tuple<API.ServiceInvocation<API.Capability, S>>} I
   * @param {API.HTTPRequest<API.AgentMessage<{ In: API.InferInvocations<I>, Out: API.Tuple<API.Receipt> }>>} request
   * @returns {Promise<API.HTTPResponse<API.AgentMessage<{ Out: API.InferReceipts<I, S>, In: API.Tuple<API.Invocation> }>>>}
   */
  async request({ headers, body }) {
    const response = await this.fetch(this.url.href, {
      headers: { ...this.headers, ...headers },
      body,
      method: this.method,
    })

    const buffer = response.ok
      ? await response.arrayBuffer()
      : HTTPError.throw(`HTTP Request failed. ${this.method} ${this.url.href} → ${response.status}`, response)

    return {
      headers: response.headers.entries
        ? Object.fromEntries(response.headers.entries())
        : /* c8 ignore next */
          {},
      body: new Uint8Array(buffer),
    }
  }
}

/**
 * @typedef {{
 * status?: number
 * statusText?: string
 * url?: string
 * }} Options
 */
class HTTPError extends Error {
  /**
   * @param {string} message
   * @param {Options} options
   * @returns {never}
   */
  static throw(message, options) {
    throw new this(message, options)
  }
  /**
   * @param {string} message
   * @param {Options} options
   */
  constructor(message, { url, status = 500, statusText = 'Server error' }) {
    super(message)
    /** @type {'HTTPError'} */
    this.name = 'HTTPError'
    this.url = url
    this.status = status
    this.statusText = statusText
  }
}

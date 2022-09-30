import * as API from '@ucanto/interface'
/**
 * @typedef {typeof fetch} Fetcher
 */
/**
 * @template T
 * @param {object} options
 * @param {URL} options.url
 * @param {Fetcher} [options.fetch]
 * @param {string} [options.method]
 * @returns {API.Channel<T>}
 */
export const open = ({ url, method = 'POST', fetch }) => {
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
  return new Channel({ url, method, fetch })
}
class Channel {
  /**
   * @param {object} options
   * @param {URL} options.url
   * @param {Fetcher} options.fetch
   * @param {string} [options.method]
   */
  constructor({ url, fetch, method }) {
    this.fetch = fetch
    this.method = method
    this.url = url
  }
  /**
   * @param {API.HTTPRequest} request
   * @returns {Promise<API.HTTPResponse>}
   */
  async request({ headers, body }) {
    const response = await this.fetch(this.url.href, {
      headers,
      body,
      method: this.method,
    })

    const buffer = response.ok
      ? await response.arrayBuffer()
      : HTTPError.throw('HTTP Request failed', response)

    return {
      headers: response.headers,
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

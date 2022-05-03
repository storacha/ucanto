import * as Transport from "./api.js";
import * as CAR from "./car.js";

/**
 * @template T
 * @param {object} options
 * @param {typeof fetch} [options.fetch]
 * @param {URL} options.url
 * @param {string} [options.method]
 * @returns {Transport.Channel<T>}
 */
export const open = ({ url, fetch  =  globalThis.fetch, method = 'POST', }) => {
  if (typeof fetch === 'undefined') {
    throw new TypeError(`ucanto HTTP transport got undefined \`fetch\`. Try passing in a \`fetch\` implementation explicitly.`)
  }
  return new Channel({ fetch, url, method });
}

class Channel {
  /**
   * @param {object} options
   * @param {URL} options.url
   * @param {typeof fetch} options.fetch
   * @param {string} [options.method]
   */
  constructor({ url, fetch, method }) {
    this.fetch = fetch;
    this.method = method;
    this.url = url;
  }
  /**
   * @param {Transport.HTTPRequest} request
   * @returns {Promise<Transport.HTTPResponse>}
   */
  async request({ headers, body }) {
    const decodedBody = await CAR.decode({ headers, body });
    const response = await this.fetch(this.url.href, {
      headers,
      body,
      method: this.method
    });

    const buffer = response.ok
      ? await response.arrayBuffer()
      : HTTPError.throw("HTTP Request failed", response);

    return {
      headers: Object.fromEntries(response.headers.entries()),
      body: new Uint8Array(buffer),
    };
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
    throw new this(message, options);
  }
  /**
   * @param {string} message
   * @param {Options} options
   */
  constructor(message, { url, status = 500, statusText = "Server error" }) {
    super(message);
    this.url = url;
    this.status = status;
    this.statusText = statusText;
  }
}

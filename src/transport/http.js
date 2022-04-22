import * as Transport from "./api.js"
import fetch from "@web-std/fetch"

/**
 * @param {URL} url
 * @returns {Transport.Channel}
 */
export const open = url => new Channel({ url })
class Channel {
  /**
   * @param {object} options
   * @param {URL} options.url
   */
  constructor({ url }) {
    this.url = url
  }
  /**
   * @param {Transport.HTTPRequest} request
   * @returns {Promise<Transport.HTTPResponse>}
   */
  async request({ headers, body }) {
    const response = await fetch(this.url.href, {
      headers,
      body,
    })

    const buffer = response.ok
      ? await response.arrayBuffer()
      : HTTPError.throw("HTTP Request failed", response)

    return {
      headers: Object.fromEntries(response.headers.entries()),
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
  constructor(message, { url, status = 500, statusText = "Server error" }) {
    super(message)
    this.url = url
    this.status = status
    this.statusText = statusText
  }
}

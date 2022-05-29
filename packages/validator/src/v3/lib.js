export * from "./capability.js"
import * as API from "../api.js"
import { Failure } from "../error.js"

/**
 * @template {`${string}:`} Protocol
 * @param {{protocol?:Protocol}} options
 * @return {(url:string) => API.Result<URL & {protocol:Protocol}, API.Problem>}
 */
export const URI =
  ({ protocol }) =>
  href => {
    try {
      const url = new URL(href)
      if (protocol != null && url.protocol !== protocol) {
        return new Failure(`Expected ${protocol} URI instead got ${url.href}`)
      } else {
        return /** @type {URL & {protocol:Protocol}} */ (url)
      }
    } catch (error) {
      return new Failure(/** @type {Error} */ (error).message)
    }
  }

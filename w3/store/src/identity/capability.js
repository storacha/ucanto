import * as Server from "@ucanto/server"
import { capability, URI, Failure, provide } from "@ucanto/server"
import * as API from "../type.js"
import store from "../store/capability.js"

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @template {Server.ParsedCapability<API.Ability>} T
 * @template {Server.ParsedCapability<API.Ability>} U
 * @param {T} claimed
 * @param {U} delegated
 */
const equalWith = (claimed, delegated) =>
  claimed.uri.href === delegated.uri.href ||
  new Failure(
    `Can not derive ${claimed.can} with ${claimed.uri.href} from ${delegated.uri.href}`
  )

export const register = capability({
  can: "identity/register",
  with: URI.match({ protocol: "mailto:" }),
  derives: (claimed, delegated) => {
    return delegated.uri.href === "mailto:*" || equalWith(claimed, delegated)
  },
})

export const link = capability({
  can: "identity/link",
  with: URI,
  derives: equalWith,
})

/**
 * `identity/identify` can be derived from any of the `store/*`
 * capability that has matichng `with`. This allows store service
 * to identify account based on any user request.
 */
export const identify = store.derive({
  to: capability({
    can: "identity/identify",
    with: URI,
    derives: equalWith,
  }),
  derives: equalWith,
})

/**
 * Represents `identity/*` capability.
 */
export default register.or(link).or(identify)

import * as Server from "@ucanto/server"
import { capability, Link, URI, Failure } from "@ucanto/server"
import * as API from "../type.js"

/**
 * @template {Server.ParsedCapability<"store/add"|"store/remove", {link?: API.Store.Link<unknown, number, number, 0|1>}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns
 */
const derives = (claimed, delegated) => {
  if (claimed.uri.href !== delegated.uri.href) {
    return new Failure(
      `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
    )
  } else if (
    delegated.caveats.link &&
    `${delegated.caveats.link}` !== `${claimed.caveats.link}`
  ) {
    return new Failure(
      `Link ${
        claimed.caveats.link == null ? "" : `${claimed.caveats.link} `
      }violates imposed ${delegated.caveats.link} constraint`
    )
  } else {
    return true
  }
}

export const add = capability({
  can: "store/add",
  with: URI.match({ protocol: "did:" }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const remove = capability({
  can: "store/remove",
  with: URI.match({ protocol: "did:" }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const list = capability({
  can: "store/list",
  with: URI.match({ protocol: "did:" }),
  derives: (claimed, delegated) => {
    if (claimed.uri.href !== delegated.uri.href) {
      return new Failure(
        `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
      )
    }
    return true
  },
})

export default add.or(remove).or(list)

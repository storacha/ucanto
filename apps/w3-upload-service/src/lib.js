import * as Server from "@ucanto/server"
import { capability, Link, provide, URI } from "@ucanto/server"
import * as API from "./type.js"
import * as Identity from "./identity.js"

/**
 * @template {Server.ParsedCapability<"store/add"|"store/remove", {link?: API.Store.Link<unknown, number, number, 0|1>}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns
 */
const derives = (claimed, delegated) => {
  if (claimed.uri.href !== delegated.uri.href) {
    return new Server.Failure(
      `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
    )
  } else if (
    delegated.caveats.link &&
    `${delegated.caveats.link}` !== `${claimed.caveats.link}`
  ) {
    return new Server.Failure(
      `Link ${
        claimed.caveats.link == null ? "" : `${claimed.caveats.link} `
      }violates imposed ${delegated.caveats.link} constraint`
    )
  } else {
    return true
  }
}

export const Add = capability({
  can: "store/add",
  with: URI.match({ protocol: "did:" }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const Remove = capability({
  can: "store/remove",
  with: URI.match({ protocol: "did:" }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const List = capability({
  can: "store/list",
  with: URI.match({ protocol: "did:" }),
  derives: (claimed, delegated) => {
    if (claimed.uri.href !== delegated.uri.href) {
      return new Server.Failure(
        `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
      )
    }
    return true
  },
})

/**
 * @param {API.Store.ServiceOptions} options
 * @returns {API.Store.Store}
 */
export const service = ({
  self,
  identity,
  accounting,
  signer,
  signerConfig,
}) => {
  return {
    add: provide(Add, async ({ capability, invocation }) => {
      const link = /** @type {API.Store.CARLink|undefined} */ (
        capability.caveats.link
      )
      if (!link) {
        return new Server.MalformedCapability(
          invocation.capabilities[0],
          new Server.Failure(`No link was provided in the capability`)
        )
      }

      const id = /** @type {API.DID} */ (capability.with)
      // First we need to check if we have an account associted with a DID
      // car is been added to.
      const [account] = await identity.execute(
        Identity.identify({
          issuer: self,
          audience: identity.id,
          id,
          // We use `store/add` invocation as a proof that we can identify an
          // account for the did.
          proof: invocation,
        })
      )

      // If we failed to resolve an account we deny access by returning n error.
      if (account.error) {
        return account
      }

      const result = await accounting.add(id, link, invocation.cid)
      if (result.error) {
        return result
      }

      if (result.status === "not-in-s3") {
        const url = await signer.sign(link, signerConfig)
        return {
          status: "upload",
          with: id,
          link,
          url: url.href,
        }
      } else {
        return {
          status: "done",
          with: id,
          link,
        }
      }
    }),
    remove: provide(Remove, async ({ capability, invocation }) => {
      const { link } = capability.caveats
      if (!link) {
        return new Server.MalformedCapability(
          invocation.capabilities[0],
          new Server.Failure(`No link was provided in the capability`)
        )
      }

      const id = /** @type {API.DID} */ (capability.with)
      await accounting.remove(id, link, invocation.cid)
      return link
    }),
    list: provide(List, async ({ capability, invocation }) => {
      const id = /** @type {API.DID} */ (capability.with)
      return await accounting.list(id, invocation.cid)
    }),
  }
}

/**
 *
 * @param {API.Store.Options} options
 */
export const server = ({
  self,
  identity,
  accounting,
  signer,
  signerConfig,
  ...options
}) =>
  Server.create({
    ...options,
    id: self.authority,
    service: {
      store: service({
        self,
        identity,
        accounting,
        signer,
        signerConfig,
      }),
    },
  })

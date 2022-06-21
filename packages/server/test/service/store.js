import * as Server from '../../src/server.js'
import * as Client from '@ucanto/client'
import { provide } from '../../src/handler.js'
import { Authority } from '@ucanto/authority'
import * as API from './api.js'
import * as Access from './access.js'
import { service as issuer } from '../fixtures.js'

const addCapability = Server.capability({
  can: 'store/add',
  with: Server.URI.match({ protocol: 'did:' }),
  caveats: {
    link: Server.Link.optional(),
  },
  derives: (claimed, delegated) => {
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
          claimed.caveats.link == null ? '' : `${claimed.caveats.link} `
        }violates imposed ${delegated.caveats.link} constraint`
      )
    } else {
      return true
    }
  },
})

const removeCapability = Server.capability({
  can: 'store/remove',
  with: Server.URI.match({ protocol: 'did:' }),
  caveats: {
    link: Server.Link.optional(),
  },
  derives: (claimed, delegated) => {
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
          claimed.caveats.link == null ? '' : `${claimed.caveats.link} `
        }violates imposed ${delegated.caveats.link} constraint`
      )
    } else {
      return true
    }
  },
})

/** @type {Map<API.DID, Map<string, API.Link>>} */
const state = new Map()

export const id = issuer.authority

export const add = provide(addCapability, async ({ capability, context }) => {
  const identify = await Client.delegate({
    issuer,
    audience: Access.id,
    capabilities: [
      {
        can: 'identity/identify',
        with: /** @type {API.Resource} */ (capability.uri.href),
      },
    ],
  })

  const account = await Access.identify(identify, context)
  if (account.error) {
    return account
  }

  const { link } = capability.caveats
  const groupID = /** @type {API.DID} */ (capability.uri.href)

  const links = state.get(groupID) || new Map()
  links.set(`${link}`, link)
  state.set(groupID, links)
})

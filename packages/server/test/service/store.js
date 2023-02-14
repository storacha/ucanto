import * as Server from '../../src/server.js'
import * as Client from '@ucanto/client'
import { provide } from '../../src/handler.js'
import * as API from './api.js'
import * as Access from './access.js'
import { service as issuer } from '../fixtures.js'
import { Schema } from '@ucanto/validator/src/lib.js'

const addCapability = Server.capability({
  can: 'store/add',
  with: Server.URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    link: Server.Link.match().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return new Server.Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return new Server.Failure(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return true
    }
  },
})

const removeCapability = Server.capability({
  can: 'store/remove',
  with: Server.URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    link: Server.Link.match().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return new Server.Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.link &&
      `${delegated.nb.link}` !== `${claimed.nb.link}`
    ) {
      return new Server.Failure(
        `Link ${
          claimed.nb.link == null ? '' : `${claimed.nb.link} `
        }violates imposed ${delegated.nb.link} constraint`
      )
    } else {
      return true
    }
  },
})

/** @type {Map<API.DID, Map<string, API.Link>>} */
const state = new Map()

export const add = provide(addCapability, async ({ capability, context }) => {
  const identify = await Client.delegate({
    issuer,
    audience: Access.id,
    capabilities: [
      {
        can: 'identity/identify',
        with: /** @type {API.Resource} */ (capability.with),
      },
    ],
  })

  const account = await Access.identify(identify, context)
  if (account.error) {
    return account
  }

  const { link } = capability.nb
  const groupID = /** @type {API.DID} */ (capability.with)

  const links = state.get(groupID) || new Map()
  links.set(`${link}`, link)
  state.set(groupID, links)
})

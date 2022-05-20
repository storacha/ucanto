import test from "ava"
import { matcher, group, ok } from "./lib.js"
import * as API from "./api.js"
import { UnknownCapability, MalformedCapability, Failure } from "../error.js"
import { the } from "../util.js"

/**
 * @param {string} href
 * @param {string} [protocol="*"]
 * @returns {API.Result<URL, Failure>}
 */
const parseURI = (href, protocol = "*") => {
  try {
    const url = new URL(href)
    if (protocol != "*" && url.protocol !== protocol) {
      return new Failure(`Expected ${protocol} URI instead got ${url.protocol}`)
    } else {
      return url
    }
  } catch (error) {
    return new Failure(/** @type {Error} */ (error).message)
  }
}

/**
 * @template {API.UCAN.Ability} Ability
 * @param {API.Capability} capability
 * @param {{can:Ability, protocol:string}} options
 */
const parseAs = (capability, { can, protocol }) => {
  if (capability.can === can) {
    const uri = parseURI(capability.with, protocol)
    return uri.error
      ? new MalformedCapability(capability, [uri.error])
      : ok({ can, uri })
  } else {
    return new UnknownCapability(capability)
  }
}

const read = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability =>
    parseAs(capability, { can: "file/read", protocol: "file:" }),
  check: (claimed, delegated) => {
    return claimed.uri.pathname.startsWith(delegated.uri.pathname)
  },
})
test("only matches corret ones", assert => {
  const v1 = read.match([
    { can: "file/read", with: "space://zAlice" },
    { can: "file/write", with: "file:///home/zAlice/" },
    { can: "file/read", with: "file:///home/zAlice/photos" },
    { can: "file/read+write", with: "file:///home/zAlice" },
  ])

  assert.like(v1, {
    ...[
      {
        group: false,
        matcher: read,
        value: { can: "file/read", uri: new URL("file:///home/zAlice/photos") },
      },
    ],
  })

  const v2 = v1[0].match([
    { can: "file/read+write", with: "file:///home/zAlice" },
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/read", with: "file:///home/zAlice/photos/public" },
    { can: "file/read", with: "file:///home/zBob" },
  ])

  v1[0].match([])

  assert.like(v2, {
    ...[
      {
        group: false,
        matcher: read,
        value: {
          can: "file/read",
          uri: { href: "file:///home/zAlice/" },
        },
      },
    ],
    length: 1,
  })
})

const verify = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability =>
    parseAs(capability, { can: "account/verify", protocol: "mailto:" }),
  check: (claim, provided) => {
    return claim.uri.href.startsWith(provided.uri.href)
  },
})

const register = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability =>
    parseAs(capability, { can: "account/register", protocol: "did:" }),
  delegates: verify,
  check: (claimed, provided) => {
    return true
  },
})

test("indirect chains", assert => {
  const v1 = register.match([
    {
      can: "account/register",
      with: "did:key:zAlice",
    },
  ])

  assert.like(v1, {
    ...[
      {
        group: false,
        matcher: verify,
        value: {
          can: "account/register",
          uri: { href: "did:key:zAlice" },
        },
      },
    ],
  })

  const v2 = v1[0].match([
    {
      can: "account/verify",
      with: "mailto:zAlice@web.mail",
    },
  ])

  assert.like(v2, {
    ...[
      {
        group: false,
        matcher: verify,
        value: {
          can: "account/verify",
          uri: { href: "mailto:zAlice@web.mail" },
        },
      },
    ],
  })
})

import test from "ava"
import { matcher, group, ok } from "./lib.js"
import * as API from "./api.js"
import { UnknownCapability, MalformedCapability, Failure } from "../error.js"
import { the } from "../util.js"

const read = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    if (capability.can === "file/read") {
      const url = parseFileURL(capability.with)
      return url.error
        ? new MalformedCapability(capability, [url.error])
        : ok({
            can: the("file/read"),
            url,
          })
    } else {
      return new UnknownCapability(capability)
    }
  },
  check: (claimed, delegated) => {
    return claimed.url.pathname.startsWith(delegated.url.pathname)
  },
})

/**
 * @param {string} string
 * @returns {API.Result<URL, Failure>}
 */
const parseFileURL = string => {
  try {
    const url = new URL(string)
    if (url.protocol !== "file:") {
      return new Failure("Expected file: URL")
    } else {
      return url
    }
  } catch (error) {
    return new Failure(/** @type {Error} */ (error).message)
  }
}

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
        value: { can: "file/read", url: new URL("file:///home/zAlice/photos") },
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
          url: { href: "file:///home/zAlice/" },
        },
      },
    ],
    length: 1,
  })
})

import { UnknownCapability } from "../error.js"
import { the } from "../util.js"
import * as API from "./api.js"
import { matcher, group } from "./lib.js"

/**
 * @template {NonNullable<unknown>} T
 * @param {T} value
 */
const ok = value => /** @type {API.Result<T, never>} */ (value)

const read = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    if (capability.can === "file/read") {
      return ok({
        can: the("file/read"),
        url: new URL(capability.with),
      })
    } else {
      return new UnknownCapability(capability)
    }
  },
  check: (claimed, delegated) => {
    return claimed.url.pathname.startsWith(delegated.url.pathname)
  },
})

const write = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    if (capability.can === "file/write") {
      return ok({
        can: the("file/write"),
        url: new URL(capability.with),
      })
    } else {
      return new UnknownCapability(capability)
    }
  },
  check: (claimed, delegated) => {
    return claimed.url.pathname.startsWith(delegated.url.pathname)
  },
})
const w = write.match([
  {
    can: "file/write",
    with: "file://~alice/",
  },
])[0]
w.value
w.matcher.match

const readnwrite = group({ read, write })
const rnw = readnwrite.match([
  {
    can: "file/write",
    with: "file://~alice/",
  },
  {
    can: "file/read",
    with: "file://~alice/",
  },
])

rnw
// rnw.value.read
// rnw.matched.read

// const readwrite = matcher({
//   /**
//    *
//    * @param {API.Capability} capability
//    * @returns
//    */
//   parse: capability => {
//     return {
//       can: the("file/read+write"),
//       url: new URL(capability.with),
//     }
//   },
//   delegates: readnwrite,
//   check: (claimed, { read, write }) => {
//     return (
//       claimed.url.pathname.startsWith(read.url.pathname) &&
//       claimed.url.pathname.startsWith(write.url.pathname)
//     )
//   },
// })

// const rw = readwrite.match([])[0]

// const rw2 = rw.matcher.match([])[0]
// rw2.value.read
// rw2.matched

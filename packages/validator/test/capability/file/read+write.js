import * as API from "./api.js"
import { ok, the, unreachable } from "../../../src/util.js"
import { MalformedCapability, UnknownCapability } from "../../../src/error.js"
import * as Read from "./read.js"
import * as Write from "./write.js"
import { or } from "../../../src/parse.js"
import { interfaces } from "mocha"

export const ability = the("file/read+write")

/**
 * @type {API.Parse<API.ReadWrite, API.ReadWrite|API.Read|API.Write>}
 */
export const match = capability => {
  if (capability.can === ability) {
    if (capability.with.startsWith("file://")) {
      return { capability, parse, check }
    } else {
      return new MalformedCapability(capability)
    }
  } else {
    return new UnknownCapability(capability)
  }
}

/**
 * @param {API.ReadWrite} claim
 * @param {(API.ReadWrite|API.Read|API.Write)[]} capabilities
 */
export const check = (claim, capabilities) => {
  const reads = []
  const writes = []
  /** @type {([API.ReadWrite]|[API.Read, API.Write])[]} */
  const results = []

  for (const capabality of capabilities) {
    switch (capabality.can) {
      case "file/read+write": {
        if (claim.with.startsWith(capabality.with)) {
          results.push([capabality])
        }
        break
      }
      case "file/read": {
        if (claim.with.startsWith(capabality.with)) {
          reads.push(capabality)
          for (const write of writes) {
            results.push([capabality, write])
          }
        }
        break
      }
      case "file/write": {
        if (claim.with.startsWith(capabality.with)) {
          writes.push(capabality)
          for (const read of reads) {
            results.push([read, capabality])
          }
        }
        break
      }
    }
  }

  return results
}

const parse = or(match, or(Read.match, Write.match))

/**
 * @template {API.Any} C
 * @param {C['can']} can
 * @returns {API.Match<C>}
 */
const parseFileCapbility =
  can =>
  /**
   * @param {API.Capability} capability
   */
  capability => {
    if (capability.can === can) {
      if (capability.with.startsWith("file://")) {
        return /** @type {C} */ (capability)
      } else {
        return new MalformedCapability(capability)
      }
    } else {
      return new UnknownCapability(capability)
    }
  }

// /** @type {API.Match<API.Read>} */
// const parseRead = parseFileCapbility("file/read")

// /** @type {API.Match<API.Write>} */
// const parseWrite = parseFileCapbility("file/write")
// /** @type {API.Match<API.ReadWrite>} */
// const parseReadWrite = parseFileCapbility("file/read+write")

// const read = API.parser(parseRead)

// read.match([{ can: "file/read", with: "file://" }])

// const write = API.parser(parseWrite)

// const readwrite = API.parser(parseReadWrite)
// // const readAndWrite = API.tuple(read, write)
// const w = write.then(write.or(readwrite))

// const out = w
//   .parse({ can: "file/write", with: "file://" })

//   .check((claim, available) => {
//     return claim.with.startsWith(available.with)
//   })

/**
 * @param {unknown} uri
 * @returns {API.Result<URL, { error: Error }>}
 */
const parseFileURI = uri => {
  try {
    const url = new URL(String(uri))
    if (url.protocol !== "file:") {
      throw new Error(`Expected file: protocol instead got ${url.protocol}`)
    } else {
      return url
    }
  } catch (error) {
    return { error: /** @type {Error} */ (error) }
  }
}

const append2 = API.create({
  can: "test/append",
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    const resource = parseFileURI(capability.with)
    if (!resource.error) {
      return { with: capability.with, url: resource }
    } else {
      return new MalformedCapability(capability)
    }
  },
  check: context => {
    context.capabilities.this
    //   context.capabilities.direct
    return true
  },
})

append2.delegated.this

const a1 = append2.parse({ can: "foo/bar", with: ":" })
if (!a1.error) {
  a1.url
}

const a2 = append2.match({ can: "foo/bar", with: ":" })
a2.capability.url

a2.delegated

const set2 = API.create({
  can: "test/set",
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    const resource = parseFileURI(capability.with)
    if (!resource.error) {
      return { with: capability.with, url: resource }
    } else {
      return new MalformedCapability(capability)
    }
  },
  derive: () => ({
    append: append2,
  }),
  check: context => {
    context.capabilities.this
    context.capabilities.append
    //   context.capabilities.direct
    return true
  },
})

const append = API.capability(
  {
    can: "test/append",
    with: parseFileURI,
  },
  {
    check: (claim, provided) => {
      const append = provided["test/append"]
      return (
        append != null && claim.with.pathname.startsWith(append.with.pathname)
      )
    },
  }
)

const set = API.capability(
  {
    can: "test/set",
    with: parseFileURI,
  },
  {
    amplify: [append],
    check: (claim, provided) => {
      const capability = provided["test/append"] || provided["test/set"]

      return (
        capability != null &&
        claim.with.pathname.startsWith(capability.with.pathname)
      )
    },
  }
)

const remove = API.capability(
  {
    can: "test/remove",
    with: parseFileURI,
  },
  {
    check: (claim, provided) => {
      const remove = provided["test/remove"]

      return (
        remove != null && claim.with.pathname.startsWith(remove.with.pathname)
      )
    },
  }
)

const modify = API.capability(
  {
    can: "test/modify",
    with: parseFileURI,
  },
  {
    amplify: [set, remove],
    check: (claim, capabilities) => {
      const modify = capabilities["test/modify"]
      if (modify) {
        return claim.with.pathname.startsWith(modify.with.pathname)
      } else {
        const remove = capabilities["test/remove"]
        const set = capabilities["test/set"]
        return (
          remove != null &&
          set != null &&
          claim.with.pathname.startsWith(remove.with.pathname) &&
          claim.with.pathname.startsWith(set.with.pathname)
        )
      }
    },
  }
)

const r1 = remove.from({ can: "*", with: ":" })
r1.matcher.can

const m = modify.from({ can: "*", with: ":" })

for (const child of m.match([])) {
  switch (child.can) {
    case "test/remove": {
      child.matcher
      const sub = child.match([])[0]
      sub.can
      break
    }
    case "test/set": {
      const sub = child.match([])[0]
      sub.can
    }
  }
}

// const read = API.capability({
//   can: the("file/read"),
//   with: parseFileURI,
// }).amplify(read => {
//   const rw = API.capability({
//     can: the("file/read+write"),
//     with: parseFileURI,
//   })

//   const write = API.capability({
//     can: the("file/write"),
//     with: parseFileURI,
//   }).amplify(write => rw.amplify(write).amplify(read))

//   return rw.amplify(read).amplify(write)
// })

// const out = read.from({ can: "*", with: "fo:" })
// const other = out.match([])
// if (!other.error) {
//   other
// }

// const write = API.capability({
//   can: the("file/write"),
//   with: parseFileURI,
// }).amplify(write =>
//   API.capability({
//     can: the("file/read+write"),
//     with: parseFileURI,
//   })
//     .amplify(read)
//     .amplify(write)
// )

// const r = read.parse({
//   can: "*",
//   with: "did:",
// })

// if (!r.error) {
//   r.with.pathname
// }

const readFile = API.create({
  can: "file/read",
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    const resource = parseFileURI(capability.with)
    if (!resource.error) {
      return { with: capability.with, url: resource }
    } else {
      return new MalformedCapability(capability)
    }
  },
  check: ({ claim, capabilities }) => {
    return claim.url.pathname.startsWith(capabilities.this.url.pathname)
  },
})

const writeFile = API.create({
  can: "file/write",
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    const resource = parseFileURI(capability.with)
    if (!resource.error) {
      return { with: capability.with, url: resource }
    } else {
      return new MalformedCapability(capability)
    }
  },
  check: ({ claim, capabilities }) => {
    return claim.url.pathname.startsWith(capabilities.this.url.pathname)
  },
})

const readAndWriteFile = API.create({
  can: "file/read+write",
  /**
   * @param {API.Capability} capability
   */
  parse: capability => {
    const resource = parseFileURI(capability.with)
    if (!resource.error) {
      return { with: capability.with, url: resource }
    } else {
      return new MalformedCapability(capability)
    }
  },
  derive: readwrite => ({
    // readwrite,
    read: readFile,
    write: writeFile,
  }),
  check: context => {
    const { claim, capabilities } = context
    capabilities.this
    capabilities.read
    capabilities.write

    // if (capabilities.read)
    return claim.url.pathname.startsWith(capabilities.this.url.pathname)
  },
})

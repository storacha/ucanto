import test from "ava"
import { matcher, group, ok, or, capability, and, amplify } from "./lib.js"
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

test("only matches correct ones", assert => {
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

test("capability selects matches", assert => {
  const read = capability({
    can: "file/read",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })

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
        value: {
          can: "file/read",
          with: new URL("file:///home/zAlice/photos"),
        },
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
          with: { href: "file:///home/zAlice/" },
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

test("derived capability chain", assert => {
  const verify = capability({
    can: "account/verify",
    with: href => parseURI(href, "mailto:"),
    check: (claim, provided) => {
      return claim.with.href.startsWith(provided.with.href)
    },
  })

  const register = verify.and({
    can: "account/register",
    with: href => parseURI(href, "did:"),
    check: (claimed, provided) => {
      /** @type {"account/register"} */
      const c1 = claimed.can
      /** @type {"account/verify"} */
      const c2 = provided.can

      return true
    },
  })

  const v1 = register.match([
    {
      can: "account/register",
      with: "did:key:zAlice",
    },
  ])

  assert.like(v1, {
    ...[
      {
        matcher: verify,
        value: {
          can: "account/register",
          with: { href: "did:key:zAlice" },
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
        matcher: verify,
        value: {
          can: "account/verify",
          with: { href: "mailto:zAlice@web.mail" },
        },
      },
    ],
  })
})

test("derive chains", assert => {
  const register = verify.derive({
    /**
     * @param {API.Capability} capability
     */
    parse: capability =>
      parseAs(capability, { can: "account/register", protocol: "did:" }),
    check: (claimed, provided) => {
      return true
    },
  })

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

const write = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability =>
    parseAs(capability, { can: "file/write", protocol: "file:" }),
  check: (claimed, delegated) => {
    return claimed.uri.pathname.startsWith(delegated.uri.pathname)
  },
})

const readwrite = matcher({
  /**
   * @param {API.Capability} capability
   */
  parse: capability =>
    parseAs(capability, { can: "file/read+write", protocol: "file:" }),
  delegates: group({ read, write }),
  check: (claimed, { read, write }) => {
    return (
      claimed.uri.pathname.startsWith(read.uri.pathname) &&
      claimed.uri.pathname.startsWith(write.uri.pathname)
    )
  },
})

test("amplification", assert => {
  assert.deepEqual(
    readwrite.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
    []
  )

  const matches = readwrite.match([
    { can: "file/read+write", with: "file:///home/zAlice/public" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(matches, {
    ...[
      {
        group: false,
        matcher: group({ read, write }),
        value: {
          can: "file/read+write",
          uri: { href: "file:///home/zAlice/public" },
        },
      },
    ],
    length: 1,
  })

  const [rw] = matches

  assert.deepEqual(
    rw.match([{ can: "file/read+write", with: "file:///home/zAlice/public" }]),
    []
  )

  const rnw = rw.match([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(rnw, {
    ...[
      {
        group: true,
        value: {
          read: {
            can: "file/read",
            uri: { href: "file:///home/zAlice/" },
          },
          write: {
            can: "file/write",
            uri: { href: "file:///home/zAlice/" },
          },
        },
      },
    ],
    length: 1,
  })

  const [subrnw] = rnw
  assert.like(
    subrnw.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
    {
      ...[
        {
          group: true,
          value: {
            read: {
              can: "file/read",
              uri: { href: "file:///home/zAlice/" },
            },
            write: {
              can: "file/write",
              uri: { href: "file:///home/zAlice/" },
            },
          },
        },
      ],
      length: 1,
    }
  )

  assert.like(
    subrnw.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
      { can: "file/read", with: "file:///home/" },
    ]),
    {
      ...[
        {
          group: true,
          value: {
            read: {
              can: "file/read",
              uri: { href: "file:///home/zAlice/" },
            },
            write: {
              can: "file/write",
              uri: { href: "file:///home/zAlice/" },
            },
          },
        },
        {
          group: true,
          value: {
            read: {
              can: "file/read",
              uri: { href: "file:///home/" },
            },
            write: {
              can: "file/write",
              uri: { href: "file:///home/zAlice/" },
            },
          },
        },
      ],
      length: 2,
    }
  )
})

test("capability amplification", assert => {
  const read = capability({
    can: "file/read",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })
  const write = capability({
    can: "file/write",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })
  const readwrite = and(group({ read, write }), {
    can: "file/read+write",
    with: url => parseURI(url, "file:"),
    check: (claimed, { read, write }) => {
      return (
        claimed.with.pathname.startsWith(read.with.pathname) &&
        claimed.with.pathname.startsWith(write.with.pathname)
      )
    },
  })

  assert.deepEqual(
    readwrite.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
    []
  )

  const matches = readwrite.match([
    { can: "file/read+write", with: "file:///home/zAlice/public" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(matches, {
    ...[
      {
        matcher: group({ read, write }),
        value: {
          can: "file/read+write",
          with: { href: "file:///home/zAlice/public" },
        },
      },
    ],
    length: 1,
  })

  const [rw] = matches

  assert.deepEqual(
    rw.match([{ can: "file/read+write", with: "file:///home/zAlice/public" }]),
    []
  )

  const rnw = rw.match([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(rnw, {
    ...[
      {
        value: {
          read: {
            can: "file/read",
            with: { href: "file:///home/zAlice/" },
          },
          write: {
            can: "file/write",
            with: { href: "file:///home/zAlice/" },
          },
        },
      },
    ],
    length: 1,
  })

  const [subrnw] = rnw
  assert.like(
    subrnw.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
    {
      ...[
        {
          value: {
            read: {
              can: "file/read",
              with: { href: "file:///home/zAlice/" },
            },
            write: {
              can: "file/write",
              with: { href: "file:///home/zAlice/" },
            },
          },
        },
      ],
      length: 1,
    }
  )

  assert.like(
    subrnw.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
      { can: "file/read", with: "file:///home/" },
    ]),
    {
      ...[
        {
          group: true,
          value: {
            read: {
              can: "file/read",
              with: { href: "file:///home/zAlice/" },
            },
            write: {
              can: "file/write",
              with: { href: "file:///home/zAlice/" },
            },
          },
        },
        {
          group: true,
          value: {
            read: {
              can: "file/read",
              with: { href: "file:///home/" },
            },
            write: {
              can: "file/write",
              with: { href: "file:///home/zAlice/" },
            },
          },
        },
      ],
      length: 2,
    }
  )
})

test("amplify", () => {
  const read = capability({
    can: "file/read",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })
  const write = capability({
    can: "file/write",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })

  const readwrite = amplify(read, write).join((read, write) => {
    const uri = read.with.href.startsWith(write.with.href)
      ? write.with
      : write.with.href.startsWith(read.with.href)
      ? read.with
      : null

    return !uri
      ? []
      : [
          {
            can: "file/read+write",
            with: uri,
            caveats: {},
          },
        ]
  })
})

test("or combinator", assert => {
  const readwrite = read.or(write)
  const matches = readwrite.match([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(matches, {
    ...[
      {
        value: {
          can: "file/read",
          uri: { href: "file:///home/zAlice/" },
        },
      },
      {
        value: {
          can: "file/write",
          uri: { href: "file:///home/zAlice/" },
        },
      },
    ],
    length: 2,
  })
})

test("capability or combinator", assert => {
  const read = capability({
    can: "file/read",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })
  const write = capability({
    can: "file/write",
    with: href => parseURI(href, "file:"),
    check: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname),
  })

  const readwrite = read.or(write)
  const matches = readwrite.match([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(matches, {
    ...[
      {
        value: {
          can: "file/read",
          with: { href: "file:///home/zAlice/" },
        },
      },
      {
        value: {
          can: "file/write",
          with: { href: "file:///home/zAlice/" },
        },
      },
    ],
    length: 2,
  })
})

test("amplification with or", assert => {
  const readwrite = matcher({
    /**
     * @param {API.Capability} capability
     */
    parse: capability =>
      parseAs(capability, { can: "file/read+write", protocol: "file:" }),
    check: (claimed, provided) =>
      claimed.uri.pathname.startsWith(provided.uri.pathname),
  })

  const readnwrite = group({
    read,
    write,
  }).derive({
    /**
     * @param {API.Capability} capability
     */
    parse: capability =>
      parseAs(capability, { can: "file/read+write", protocol: "file:" }),
    check: (claimed, { read, write }) => {
      return (
        claimed.uri.href.startsWith(read.uri.href) &&
        claimed.uri.href.startsWith(write.uri.href)
      )
    },
  })

  const rw = readwrite.or(readnwrite)

  assert.deepEqual(
    rw.match([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
    []
  )

  const matches = rw.match([
    { can: "file/read+write", with: "file:///home/zAlice/public" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(matches, {
    ...[
      {
        matcher: readwrite,
        value: {
          can: "file/read+write",
          uri: { href: "file:///home/zAlice/public" },
        },
      },
      {
        matcher: group({
          read,
          write,
        }),
        value: {
          can: "file/read+write",
          uri: { href: "file:///home/zAlice/public" },
        },
      },
    ],
    length: 2,
  })
})

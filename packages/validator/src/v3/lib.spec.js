import test from "ava"
import { capability, URI } from "./lib.js"
import * as API from "./api.js"
import { Failure } from "../error.js"
import { the } from "../util.js"
import { CID } from "multiformats"

/**
 * @param {unknown} value
 * @returns {any}
 */
const like = value =>
  Array.isArray(value) ? { ...value, length: value.length } : value

/**
 *
 * @param {API.SourceCapability[]} capabilities
 * @param {object} delegation
 * @returns {API.Source[]}
 */
const delegate = (capabilities, delegation = {}) =>
  // @ts-expect-error - this represents Delegation
  capabilities.map((capability, index) => ({
    capability,
    delegation,
    index,
  }))

test("capability selects matches", assert => {
  const read = capability({
    can: "file/read",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) => {
      if (claimed.uri.pathname.startsWith(delegated.uri.pathname)) {
        return true
      } else {
        return new Failure(
          `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
        )
      }
    },
  })

  const d1 = delegate([
    { can: "file/read", with: "space://zAlice" },
    { can: "file/write", with: "file:///home/zAlice/" },
    { can: "file/read", with: "file:///home/zAlice/photos" },
    { can: "file/read+write", with: "file:///home/zAlice" },
  ])

  const v1 = read.select(d1)

  assert.like(v1, {
    matches: like([
      {
        source: [d1[2]],
        value: {
          can: "file/read",
          uri: { href: "file:///home/zAlice/photos" },
        },
      },
    ]),
    errors: like([
      {
        name: "InvalidClaim",
        context: {
          can: "file/read",
          value: undefined,
        },
        causes: like([
          {
            name: "MalformedCapability",
            capability: { can: "file/read", with: "space://zAlice" },
            cause: {
              message: "Expected file: URI instead got space://zAlice",
            },
          },
        ]),
      },
    ]),
    unknown: like([
      { can: "file/write", with: "file:///home/zAlice/" },
      {
        can: "file/read+write",
        with: "file:///home/zAlice",
      },
    ]),
  })

  const [match] = v1.matches
  const d2 = delegate([
    { can: "file/read+write", with: "file:///home/zAlice" },
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/read", with: "file:///home/zAlice/photos/public" },
    { can: "file/read", with: "file:///home/zBob" },
  ])
  const v2 = match.select(d2)

  assert.like(v2, {
    matches: like([
      {
        source: [d2[1]],
        value: {
          can: "file/read",
          uri: { href: "file:///home/zAlice/" },
        },
      },
    ]),
    unknown: like([
      {
        can: "file/read+write",
        with: "file:///home/zAlice",
      },
    ]),
    errors: like([
      {
        name: "InvalidClaim",
        context: {
          value: {
            can: "file/read",
            uri: { href: "file:///home/zAlice/photos" },
            caveats: {},
          },
        },
        causes: like([
          {
            name: "EscalatedCapability",
            claimed: {
              can: "file/read",
              uri: { href: "file:///home/zAlice/photos" },
            },
            delegated: {
              can: "file/read",
              uri: { href: "file:///home/zAlice/photos/public" },
            },
            cause: {
              message: `'file:///home/zAlice/photos' is not contained in 'file:///home/zAlice/photos/public'`,
            },
          },
        ]),
      },
      {
        name: "InvalidClaim",
        context: {
          value: {
            can: "file/read",
            uri: { href: "file:///home/zAlice/photos" },
            caveats: {},
          },
        },
        causes: like([
          {
            name: "EscalatedCapability",
            claimed: {
              can: "file/read",
              uri: { href: "file:///home/zAlice/photos" },
            },
            delegated: {
              can: "file/read",
              uri: { href: "file:///home/zBob" },
            },
            cause: {
              message: `'file:///home/zAlice/photos' is not contained in 'file:///home/zBob'`,
            },
          },
        ]),
      },
    ]),
  })
})

test("derived capability chain", assert => {
  const verify = capability({
    can: "account/verify",
    with: URI({ protocol: "mailto:" }),
    derives: (claimed, delegated) => {
      if (claimed.uri.href.startsWith(delegated.uri.href)) {
        return true
      } else {
        return new Failure(
          `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
        )
      }
    },
  })

  const register = verify.derive({
    to: capability({
      can: "account/register",
      with: URI({ protocol: "mailto:" }),
      derives: (claimed, delegated) => {
        /** @type {"account/register"} */
        const c1 = claimed.can
        /** @type {"account/register"} */
        const c2 = delegated.can

        return (
          claimed.uri.href === delegated.uri.href ||
          new Failure(`'${claimed.uri.href}' != '${delegated.uri.href}'`)
        )
      },
    }),
    derives: (claimed, delegated) => {
      /** @type {"account/register"} */
      const c1 = claimed.can
      /** @type {"account/verify"} */
      const c2 = delegated.can

      return (
        claimed.uri.href === delegated.uri.href ||
        new Failure(`'${claimed.uri.href}' != '${delegated.uri.href}'`)
      )
    },
  })

  const d1 = delegate([
    {
      can: "account/register",
      with: "mailto:zAlice@web.mail",
    },
  ])

  const regs = register.select(d1)

  assert.like(
    regs,
    {
      matches: like([
        {
          source: [d1[0]],
          value: {
            can: "account/register",
            uri: {
              href: "mailto:zAlice@web.mail",
            },
          },
        },
      ]),
      unknown: [],
      errors: [],
    },
    "selects registration capability"
  )

  const d2 = delegate([
    {
      can: "account/register",
      with: "did:key:zAlice",
    },
  ])

  assert.like(register.select(d2), {
    matches: like([]),
    errors: like([
      {
        name: "InvalidClaim",
        context: {
          can: "account/register",
        },
        causes: like([
          {
            name: "MalformedCapability",
            capability: {
              can: "account/register",
              with: "did:key:zAlice",
            },
            cause: {
              message: `Expected mailto: URI instead got did:key:zAlice`,
            },
          },
        ]),
      },
    ]),
    unknown: like([]),
  })

  const [reg] = regs.matches

  const d3 = delegate([
    {
      can: "account/verify",
      with: "mailto:zAlice@web.mail",
    },
  ])

  assert.like(
    reg.select(d3),
    {
      matches: like([
        {
          source: [d3[0]],
          value: {
            can: "account/verify",
            uri: {
              href: "mailto:zAlice@web.mail",
            },
          },
        },
      ]),
      unknown: [],
      errors: [],
    },
    "matches verification"
  )

  const d4 = delegate([
    {
      can: "account/verify",
      with: "mailto:bob@web.mail",
    },
  ])

  assert.like(
    reg.select(d4),
    {
      matches: [],
      unknown: [],
      errors: like([
        {
          name: "InvalidClaim",
          context: {
            value: {
              can: "account/register",
              uri: { href: "mailto:zAlice@web.mail" },
            },
          },
          causes: like([
            {
              name: "EscalatedCapability",
              claimed: {
                can: "account/register",
                uri: { href: "mailto:zAlice@web.mail" },
              },
              delegated: {
                can: "account/verify",
                uri: { href: "mailto:bob@web.mail" },
              },
              cause: {
                message: `'mailto:zAlice@web.mail' != 'mailto:bob@web.mail'`,
              },
            },
          ]),
        },
      ]),
    },
    "does not match on different email"
  )

  const d5 = delegate([
    {
      can: "account/register",
      with: "mailto:zAlice@web.mail",
    },
  ])

  assert.like(
    reg.select(d5),
    {
      matches: like([
        {
          value: {
            can: "account/register",
            uri: { href: "mailto:zAlice@web.mail" },
          },
        },
      ]),
      unknown: [],
      errors: [],
    },
    "normal delegation also works"
  )

  const registration = {
    can: the("account/register"),
    with: the("mailto:zAlice@web.mail"),
  }
  const verification = {
    can: the("account/verify"),
    with: the("mailto:zAlice@web.mail"),
  }

  const d6 = delegate([verification])
  assert.like(
    register
      .select(delegate([registration]))
      .matches[0].select(delegate([registration]))
      .matches[0].select(delegate([registration]))
      .matches[0].select(delegate([registration]))
      .matches[0].select(delegate([verification]))
      .matches[0].select(d6),
    {
      matches: like([
        {
          source: [d6[0]],
          value: {
            can: "account/verify",
            uri: { href: "mailto:zAlice@web.mail" },
          },
        },
      ]),
      unknown: [],
      errors: [],
    },
    "derived capability is recursive"
  )

  assert.like(
    register
      .select(delegate([registration]))
      .matches[0].select(delegate([verification]))
      .matches[0].select(delegate([registration])),
    {
      matches: [],
      unknown: [registration],
      errors: [],
    },
    "deriviation is works one way"
  )
})

test("capability amplification", assert => {
  const read = capability({
    can: "file/read",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.uri.pathname.startsWith(delegated.uri.pathname) ||
      new Failure(
        `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
      ),
  })

  const write = capability({
    can: "file/write",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.uri.pathname.startsWith(delegated.uri.pathname) ||
      new Failure(
        `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
      ),
  })

  const readwrite = read.and(write).derive({
    to: capability({
      can: "file/read+write",
      with: URI({ protocol: "file:" }),
      derives: (claimed, delegated) =>
        claimed.uri.pathname.startsWith(delegated.uri.pathname) ||
        new Failure(
          `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
        ),
    }),
    derives: (claimed, [read, write]) => {
      if (!claimed.uri.pathname.startsWith(read.uri.pathname)) {
        return new Failure(
          `'${claimed.uri.href}' is not contained in '${read.uri.href}'`
        )
      } else if (!claimed.uri.pathname.startsWith(write.uri.pathname)) {
        return new Failure(
          `'${claimed.uri.href}' is not contained in '${write.uri.href}'`
        )
      } else {
        return true
      }
    },
  })

  const d1 = delegate([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(
    readwrite.select(d1),
    {
      matches: [],
      errors: [],
      unknown: [
        { can: "file/read", with: "file:///home/zAlice/" },
        { can: "file/write", with: "file:///home/zAlice/" },
      ],
    },
    "expects derived capability read+write"
  )

  const d2 = delegate([
    { can: "file/read+write", with: "file:///home/zAlice/public" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  const selected = readwrite.select(d2)

  assert.like(
    selected,
    {
      matches: like([
        {
          source: [d2[0]],
          value: {
            can: "file/read+write",
            uri: { href: "file:///home/zAlice/public" },
          },
        },
      ]),
      errors: [],
      unknown: [{ can: "file/write", with: "file:///home/zAlice/" }],
    },
    "only selected matched"
  )

  const [rw] = selected.matches

  const d3 = delegate([
    { can: "file/read+write", with: "file:///home/zAlice/public" },
  ])

  assert.like(
    rw.select(d3),
    {
      matches: like([
        {
          source: [d3[0]],
          value: {
            can: "file/read+write",
            uri: { href: "file:///home/zAlice/public" },
          },
        },
      ]),
      errors: [],
      unknown: [],
    },
    "can derive from matching"
  )

  const d4 = delegate([
    { can: "file/read+write", with: "file:///home/zAlice/public/photos" },
  ])

  assert.like(
    rw.select(d4),
    {
      matches: [],
      unknown: [],
      errors: like([
        {
          error: {
            name: "InvalidClaim",
            context: {
              value: {
                can: "file/read+write",
                uri: { href: "file:///home/zAlice/public" },
              },
            },
            causes: like([
              {
                name: "EscalatedCapability",
                claimed: {
                  can: "file/read+write",
                  uri: { href: "file:///home/zAlice/public" },
                },
                delegated: {
                  can: "file/read+write",
                  uri: { href: "file:///home/zAlice/public/photos" },
                },
                cause: {
                  message: `'file:///home/zAlice/public' is not contained in 'file:///home/zAlice/public/photos'`,
                },
              },
            ]),
          },
        },
      ]),
    },
    "can not derive from escalated path"
  )

  const d5 = delegate([
    { can: "file/read+write", with: "file:///home/zAlice/" },
  ])

  assert.like(
    rw.select(d5),
    {
      matches: like([
        {
          source: [d5[0]],
          value: {
            can: "file/read+write",
            uri: { href: "file:///home/zAlice/" },
          },
        },
      ]),
      unknown: [],
      errors: [],
    },
    "can derive from greater capabilities"
  )

  const d6 = delegate([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/public" },
  ])

  const rnw = rw.select(d6)

  assert.like(
    rnw,
    {
      matches: like([
        {
          source: [d6[0], d6[1]],
          value: like([
            {
              can: "file/read",
              uri: { href: "file:///home/zAlice/" },
            },
            {
              can: "file/write",
              uri: { href: "file:///home/zAlice/public" },
            },
          ]),
        },
      ]),
      unknown: [],
      errors: [],
    },
    "can derive amplification"
  )

  const [reandnwrite] = rnw.matches

  const d7 = delegate([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(
    reandnwrite.select(d7),
    {
      matches: like([
        {
          source: [d7[0], d7[1]],
          value: like([
            {
              can: "file/read",
              uri: { href: "file:///home/zAlice/" },
            },
            {
              can: "file/write",
              uri: { href: "file:///home/zAlice/" },
            },
          ]),
        },
      ]),
      unknown: [],
      errors: [],
    },
    "can derive amplification"
  )

  const d8 = delegate([
    { can: "file/read", with: "file:///home/zAlice/public/photos/" },
    { can: "file/write", with: "file:///home/zAlice/public" },
  ])

  assert.like(
    rw.select(d8),
    {
      matches: [],
      unknown: [],
      errors: like([
        {
          name: "InvalidClaim",
          context: {
            value: {
              can: "file/read+write",
              uri: { href: "file:///home/zAlice/public" },
            },
          },
          causes: like([
            {
              name: "EscalatedCapability",
              claimed: {
                can: "file/read+write",
                uri: { href: "file:///home/zAlice/public" },
              },
              delegated: like([
                {
                  can: "file/read",
                  uri: { href: "file:///home/zAlice/public/photos/" },
                },
                {
                  can: "file/write",
                  uri: { href: "file:///home/zAlice/public" },
                },
              ]),
              cause: {
                message: `'file:///home/zAlice/public' is not contained in 'file:///home/zAlice/public/photos/'`,
              },
            },
          ]),
        },
      ]),
    },
    "can derive amplification"
  )

  const [r1, w1] = delegate([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  const [r2] = delegate([{ can: "file/read", with: "file:///home/" }])

  assert.like(
    reandnwrite.select([r1, w1, r2]),
    {
      matches: like([
        {
          source: [r1, w1],
          value: like([
            {
              can: "file/read",
              uri: { href: "file:///home/zAlice/" },
            },
            {
              can: "file/write",
              uri: { href: "file:///home/zAlice/" },
            },
          ]),
        },
        {
          source: [r2, w1],
          value: like([
            {
              can: "file/read",
              uri: { href: "file:///home/" },
            },
            {
              can: "file/write",
              uri: { href: "file:///home/zAlice/" },
            },
          ]),
        },
      ]),
      unknown: [],
      errors: [],
    },
    "selects all combinations"
  )
})

test("capability or combinator", assert => {
  const read = capability({
    can: "file/read",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.uri.pathname.startsWith(delegated.uri.pathname) ||
      new Failure(
        `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
      ),
  })

  const write = capability({
    can: "file/write",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.uri.pathname.startsWith(delegated.uri.pathname) ||
      new Failure(
        `'${claimed.uri.href}' is not contained in '${delegated.uri.href}'`
      ),
  })

  const readwrite = read.or(write)

  const [r, w] = delegate([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  const selection = readwrite.select([r, w])

  assert.like(
    selection,
    {
      matches: like([
        {
          source: [r],
          value: {
            can: "file/read",
            uri: { href: "file:///home/zAlice/" },
          },
        },
        {
          source: [w],
          value: {
            can: "file/write",
            uri: { href: "file:///home/zAlice/" },
          },
        },
      ]),
      errors: [],
      unknown: [],
    },
    "matches both capabilities"
  )
})

test("parse with caveats", assert => {
  const storeAdd = capability({
    can: "store/add",
    with: URI({ protocol: "did:" }),
    caveats: {
      link: cid => {
        if (cid == null) {
          return undefined
        } else {
          const result = CID.asCID(cid)
          if (result) {
            return result
          } else {
            return new Failure(`Expected 'link' to be a CID instead of ${cid}`)
          }
        }
      },
    },
    derives: (claimed, delegated) => {
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
    },
  })

  const v1 = storeAdd.select(
    delegate([{ can: "store/add", with: "did:key:zAlice", link: 5 }])
  )

  assert.like(v1, {
    matches: [],
    unknown: [],
    errors: like([
      {
        name: "InvalidClaim",
        context: {
          can: "store/add",
        },
        causes: like([
          {
            name: "MalformedCapability",
            capability: { can: "store/add", with: "did:key:zAlice", link: 5 },
            cause: {
              message: "Expected 'link' to be a CID instead of 5",
            },
          },
        ]),
      },
    ]),
  })

  const v2 = storeAdd.select(
    delegate([{ can: "store/add", with: "did:key:zAlice" }])
  )

  assert.like(v2, {
    unknown: [],
    errors: [],
    matches: like([
      {
        value: {
          can: "store/add",
          uri: { href: "did:key:zAlice" },
          caveats: {},
        },
      },
    ]),
  })

  const [match] = v2.matches

  const v3 = match.select(
    delegate([
      {
        can: "store/add",
        with: "did:key:zAlice",
        link: CID.parse(
          "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
        ),
      },
    ])
  )

  assert.like(v3, {
    errors: like([
      {
        name: "InvalidClaim",
        context: {
          value: {
            can: "store/add",
            uri: { href: "did:key:zAlice" },
            caveats: {},
          },
        },
        causes: like([
          {
            name: "EscalatedCapability",
            claimed: {
              can: "store/add",
              uri: { href: "did:key:zAlice" },
              caveats: {},
            },
            delegated: {
              can: "store/add",
              uri: { href: "did:key:zAlice" },
              caveats: {
                link: CID.parse(
                  "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
                ),
              },
            },
            cause: {
              message: `Link violates imposed bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4 constraint`,
            },
          },
        ]),
      },
    ]),
    unknown: [],
    matches: [],
  })

  const v4 = storeAdd.select(
    delegate([
      {
        can: "store/add",
        with: "did:key:zAlice",
        link: CID.parse(
          "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
        ),
      },
    ])
  )
  const [match2] = v4.matches

  const v5 = match2.select(
    delegate([
      {
        can: "store/add",
        with: "did:key:zAlice",
        link: CID.parse(
          "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
        ),
      },
    ])
  )

  assert.like(v5, {
    unknown: [],
    errors: [],
    matches: like([
      {
        value: {
          can: "store/add",
          uri: { href: "did:key:zAlice" },
          caveats: {
            link: CID.parse(
              "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
            ),
          },
        },
      },
    ]),
  })

  const v6 = match2.select(
    delegate([
      {
        can: "store/add",
        with: "did:key:zAlice",
        link: CID.parse(
          "bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny"
        ),
      },
    ])
  )

  assert.like(v6, {
    errors: like([
      {
        name: "InvalidClaim",
        context: {
          value: {
            can: "store/add",
            uri: { href: "did:key:zAlice" },
            caveats: {
              link: CID.parse(
                "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
              ),
            },
          },
        },
        causes: like([
          {
            name: "EscalatedCapability",
            claimed: {
              can: "store/add",
              uri: { href: "did:key:zAlice" },
              caveats: {
                link: CID.parse(
                  "bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4"
                ),
              },
            },
            delegated: {
              can: "store/add",
              uri: { href: "did:key:zAlice" },
              caveats: {
                link: CID.parse(
                  "bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny"
                ),
              },
            },
            cause: {
              message: `Link bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4 violates imposed bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny constraint`,
            },
          },
        ]),
      },
    ]),
    unknown: [],
    matches: [],
  })
})

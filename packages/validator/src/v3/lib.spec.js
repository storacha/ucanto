import test from "ava"
import { capability, URI } from "./lib.js"
import * as API from "./api.js"
import { Failure } from "../error.js"
import { the } from "../util.js"

/**
 * @param {unknown} value
 * @returns {any}
 */
const like = value =>
  Array.isArray(value) ? { ...value, length: value.length } : value

test("capability selects matches", assert => {
  const read = capability({
    can: "file/read",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) => {
      if (claimed.with.pathname.startsWith(delegated.with.pathname)) {
        return true
      } else {
        return new Failure(
          `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
        )
      }
    },
  })

  const v1 = read.select2([
    { can: "file/read", with: "space://zAlice" },
    { can: "file/write", with: "file:///home/zAlice/" },
    { can: "file/read", with: "file:///home/zAlice/photos" },
    { can: "file/read+write", with: "file:///home/zAlice" },
  ])

  assert.like(v1, {
    matches: like([
      {
        value: {
          can: "file/read",
          with: { href: "file:///home/zAlice/photos" },
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
  const v2 = match.select2([
    { can: "file/read+write", with: "file:///home/zAlice" },
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/read", with: "file:///home/zAlice/photos/public" },
    { can: "file/read", with: "file:///home/zBob" },
  ])

  assert.like(v2, {
    matches: like([
      {
        value: {
          can: "file/read",
          with: { href: "file:///home/zAlice/" },
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
            with: { href: "file:///home/zAlice/photos" },
            caveats: {},
          },
        },
        causes: like([
          {
            name: "EscalatedCapability",
            claimed: {
              can: "file/read",
              with: { href: "file:///home/zAlice/photos" },
            },
            delegated: {
              can: "file/read",
              with: { href: "file:///home/zAlice/photos/public" },
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
            with: { href: "file:///home/zAlice/photos" },
            caveats: {},
          },
        },
        causes: like([
          {
            name: "EscalatedCapability",
            claimed: {
              can: "file/read",
              with: { href: "file:///home/zAlice/photos" },
            },
            delegated: {
              can: "file/read",
              with: { href: "file:///home/zBob" },
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

test("derived capability chain 2", assert => {
  const verify = capability({
    can: "account/verify",
    with: URI({ protocol: "mailto:" }),
    derives: (claimed, delegated) => {
      if (claimed.with.href.startsWith(delegated.with.href)) {
        return true
      } else {
        return new Failure(
          `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
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
          claimed.with.href === delegated.with.href ||
          new Failure(`'${claimed.with.href}' != '${delegated.with.href}'`)
        )
      },
    }),
    derives: (claimed, delegated) => {
      /** @type {"account/register"} */
      const c1 = claimed.can
      /** @type {"account/verify"} */
      const c2 = delegated.can

      return (
        claimed.with.href === delegated.with.href ||
        new Failure(`'${claimed.with.href}' != '${delegated.with.href}'`)
      )
    },
  })

  const regs = register.select2([
    {
      can: "account/register",
      with: "mailto:zAlice@web.mail",
    },
  ])

  assert.like(
    regs,
    {
      matches: like([
        {
          value: {
            can: "account/register",
            with: {
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

  assert.like(
    register.select2([
      {
        can: "account/register",
        with: "did:key:zAlice",
      },
    ]),
    {
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
    }
  )

  const [reg] = regs.matches

  assert.like(
    reg.select2([
      {
        can: "account/verify",
        with: "mailto:zAlice@web.mail",
      },
    ]),
    {
      matches: like([
        {
          value: {
            can: "account/verify",
            with: {
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

  assert.like(
    reg.select2([
      {
        can: "account/verify",
        with: "mailto:bob@web.mail",
      },
    ]),
    {
      matches: [],
      unknown: [],
      errors: like([
        {
          name: "InvalidClaim",
          context: {
            value: {
              can: "account/register",
              with: { href: "mailto:zAlice@web.mail" },
            },
          },
          causes: like([
            {
              name: "EscalatedCapability",
              claimed: {
                can: "account/register",
                with: { href: "mailto:zAlice@web.mail" },
              },
              delegated: {
                can: "account/verify",
                with: { href: "mailto:bob@web.mail" },
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

  assert.like(
    reg.select2([
      {
        can: "account/register",
        with: "mailto:zAlice@web.mail",
      },
    ]),
    {
      matches: like([
        {
          value: {
            can: "account/register",
            with: { href: "mailto:zAlice@web.mail" },
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

  assert.like(
    register
      .select2([registration])
      .matches[0].select2([registration])
      .matches[0].select2([registration])
      .matches[0].select2([registration])
      .matches[0].select2([verification])
      .matches[0].select2([verification]),
    {
      matches: like([
        {
          value: {
            can: "account/verify",
            with: { href: "mailto:zAlice@web.mail" },
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
      .select2([registration])
      .matches[0].select2([verification])
      .matches[0].select2([registration]),
    {
      matches: [],
      unknown: [registration],
      errors: [],
    },
    "deriviation is works one way"
  )
})

test("capability amplification 2", assert => {
  const read = capability({
    can: "file/read",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname) ||
      new Failure(
        `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
      ),
  })

  const write = capability({
    can: "file/write",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname) ||
      new Failure(
        `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
      ),
  })

  const readwrite = read.and(write).derive({
    to: capability({
      can: "file/read+write",
      with: URI({ protocol: "file:" }),
      derives: (claimed, delegated) =>
        claimed.with.pathname.startsWith(delegated.with.pathname) ||
        new Failure(
          `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
        ),
    }),
    derives: (claimed, [read, write]) => {
      if (!claimed.with.pathname.startsWith(read.with.pathname)) {
        return new Failure(
          `'${claimed.with.href}' is not contained in '${read.with.href}'`
        )
      } else if (!claimed.with.pathname.startsWith(write.with.pathname)) {
        return new Failure(
          `'${claimed.with.href}' is not contained in '${write.with.href}'`
        )
      } else {
        return true
      }
    },
  })

  assert.like(
    readwrite.select2([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
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

  const selected = readwrite.select2([
    { can: "file/read+write", with: "file:///home/zAlice/public" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(
    selected,
    {
      matches: like([
        {
          value: {
            can: "file/read+write",
            with: { href: "file:///home/zAlice/public" },
          },
        },
      ]),
      errors: [],
      unknown: [{ can: "file/write", with: "file:///home/zAlice/" }],
    },
    "only selected matched"
  )

  const [rw] = selected.matches

  assert.like(
    rw.select2([
      { can: "file/read+write", with: "file:///home/zAlice/public" },
    ]),
    {
      matches: like([
        {
          value: {
            can: "file/read+write",
            with: { href: "file:///home/zAlice/public" },
          },
        },
      ]),
      errors: [],
      unknown: [],
    },
    "can derive from matching"
  )

  assert.like(
    rw.select2([
      { can: "file/read+write", with: "file:///home/zAlice/public/photos" },
    ]),
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
                with: { href: "file:///home/zAlice/public" },
              },
            },
            causes: like([
              {
                name: "EscalatedCapability",
                claimed: {
                  can: "file/read+write",
                  with: { href: "file:///home/zAlice/public" },
                },
                delegated: {
                  can: "file/read+write",
                  with: { href: "file:///home/zAlice/public/photos" },
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

  assert.like(
    rw.select2([{ can: "file/read+write", with: "file:///home/zAlice/" }]),
    {
      matches: like([
        {
          value: {
            can: "file/read+write",
            with: new URL("file:///home/zAlice/"),
          },
        },
      ]),
      unknown: [],
      errors: [],
    },
    "can derive from greater capabilities"
  )

  const rnw = rw.select2([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/public" },
  ])

  assert.like(
    rnw,
    {
      matches: like([
        {
          value: like([
            {
              can: "file/read",
              with: { href: "file:///home/zAlice/" },
            },
            {
              can: "file/write",
              with: { href: "file:///home/zAlice/public" },
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

  assert.like(
    reandnwrite.select2([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
    ]),
    {
      matches: like([
        {
          value: like([
            {
              can: "file/read",
              with: { href: "file:///home/zAlice/" },
            },
            {
              can: "file/write",
              with: { href: "file:///home/zAlice/" },
            },
          ]),
        },
      ]),
      unknown: [],
      errors: [],
    },
    "can derive amplification"
  )

  assert.like(
    rw.select2([
      { can: "file/read", with: "file:///home/zAlice/public/photos/" },
      { can: "file/write", with: "file:///home/zAlice/public" },
    ]),
    {
      matches: [],
      unknown: [],
      errors: like([
        {
          name: "InvalidClaim",
          context: {
            value: {
              can: "file/read+write",
              with: { href: "file:///home/zAlice/public" },
            },
          },
          causes: like([
            {
              name: "EscalatedCapability",
              claimed: {
                can: "file/read+write",
                with: { href: "file:///home/zAlice/public" },
              },
              delegated: like([
                {
                  can: "file/read",
                  with: { href: "file:///home/zAlice/public/photos/" },
                },
                {
                  can: "file/write",
                  with: { href: "file:///home/zAlice/public" },
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

  assert.like(
    reandnwrite.select2([
      { can: "file/read", with: "file:///home/zAlice/" },
      { can: "file/write", with: "file:///home/zAlice/" },
      { can: "file/read", with: "file:///home/" },
    ]),
    {
      matches: like([
        {
          value: like([
            {
              can: "file/read",
              with: { href: "file:///home/zAlice/" },
            },
            {
              can: "file/write",
              with: { href: "file:///home/zAlice/" },
            },
          ]),
        },
        {
          value: like([
            {
              can: "file/read",
              with: { href: "file:///home/" },
            },
            {
              can: "file/write",
              with: { href: "file:///home/zAlice/" },
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

test("capability or combinator 2", assert => {
  const read = capability({
    can: "file/read",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname) ||
      new Failure(
        `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
      ),
  })

  const write = capability({
    can: "file/write",
    with: URI({ protocol: "file:" }),
    derives: (claimed, delegated) =>
      claimed.with.pathname.startsWith(delegated.with.pathname) ||
      new Failure(
        `'${claimed.with.href}' is not contained in '${delegated.with.href}'`
      ),
  })

  const readwrite = read.or(write)
  const selection = readwrite.select2([
    { can: "file/read", with: "file:///home/zAlice/" },
    { can: "file/write", with: "file:///home/zAlice/" },
  ])

  assert.like(
    selection,
    {
      matches: like([
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
      ]),
      errors: [],
      unknown: [],
    },
    "matches both capabilities"
  )
})

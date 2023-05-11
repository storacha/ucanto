import { capability, URI, Link, Schema, ok, fail } from '../src/lib.js'
import { invoke, parseLink } from '@ucanto/core'
import * as API from '@ucanto/interface'
import { Failure } from '../src/error.js'
import { the } from '../src/util.js'
import { test, assert } from './test.js'
import { alice, bob, mallory, service as w3 } from './fixtures.js'

/**
 * @template {API.Capabilities} C
 * @param {C} capabilities
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

/**
 * @param {API.Capability} capability
 * @param {object} delegation
 */
const source = (capability, delegation = {}) =>
  delegate([capability], delegation)[0]

test('capability selects matches', () => {
  const read = capability({
    can: 'file/read',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) => {
      if (claimed.with.startsWith(delegated.with)) {
        return ok({})
      } else {
        return fail(`'${claimed.with}' is not contained in '${delegated.with}'`)
      }
    },
  })

  const d1 = delegate([
    { can: 'file/read', with: 'space://zAlice' },
    { can: 'file/write', with: 'file:///home/zAlice/' },
    { can: 'file/read', with: 'file:///home/zAlice/photos' },
    { can: 'file/read+write', with: 'file:///home/zAlice' },
  ])

  const v1 = read.select(d1)

  assert.containSubset(v1, {
    matches: [
      {
        source: [d1[2]],
        value: {
          can: 'file/read',
          with: 'file:///home/zAlice/photos',
        },
      },
    ],
    errors: [
      {
        name: 'InvalidClaim',
        context: {
          can: 'file/read',
          value: undefined,
        },
        causes: [
          {
            name: 'MalformedCapability',
            capability: { can: 'file/read', with: 'space://zAlice' },
            cause: {
              message: 'Expected file: URI instead got space://zAlice',
            },
          },
        ],
      },
    ],
    unknown: [
      { can: 'file/write', with: 'file:///home/zAlice/' },
      {
        can: 'file/read+write',
        with: 'file:///home/zAlice',
      },
    ],
  })

  const [match] = v1.matches
  const d2 = delegate([
    { can: 'file/read+write', with: 'file:///home/zAlice' },
    { can: 'file/read', with: 'file:///home/zAlice/' },
    { can: 'file/read', with: 'file:///home/zAlice/photos/public' },
    { can: 'file/read', with: 'file:///home/zBob' },
  ])
  const v2 = match.select(d2)

  assert.containSubset(v2, {
    matches: [
      {
        source: [d2[1]],
        value: {
          can: 'file/read',
          with: 'file:///home/zAlice/',
        },
      },
    ],
    unknown: [
      {
        can: 'file/read+write',
        with: 'file:///home/zAlice',
      },
    ],
    errors: [
      {
        name: 'InvalidClaim',
        context: {
          value: {
            can: 'file/read',
            with: 'file:///home/zAlice/photos',
            nb: {},
          },
        },
        causes: [
          {
            name: 'EscalatedCapability',
            claimed: {
              can: 'file/read',
              with: 'file:///home/zAlice/photos',
            },
            delegated: {
              can: 'file/read',
              with: 'file:///home/zAlice/photos/public',
            },
            cause: {
              message: `'file:///home/zAlice/photos' is not contained in 'file:///home/zAlice/photos/public'`,
            },
          },
        ],
      },
      {
        name: 'InvalidClaim',
        context: {
          value: {
            can: 'file/read',
            with: 'file:///home/zAlice/photos',
            nb: {},
          },
        },
        causes: [
          {
            name: 'EscalatedCapability',
            claimed: {
              can: 'file/read',
              with: 'file:///home/zAlice/photos',
            },
            delegated: {
              can: 'file/read',
              with: 'file:///home/zBob',
            },
            cause: {
              message: `'file:///home/zAlice/photos' is not contained in 'file:///home/zBob'`,
            },
          },
        ],
      },
    ],
  })
})

test('derived capability chain', () => {
  const verify = capability({
    can: 'account/verify',
    with: URI.match({ protocol: 'mailto:' }),
    derives: (claimed, delegated) => {
      if (claimed.with.startsWith(delegated.with)) {
        return ok({})
      } else {
        return fail(`'${claimed.with}' is not contained in '${delegated.with}'`)
      }
    },
  })

  const register = verify.derive({
    to: capability({
      can: 'account/register',
      with: URI.match({ protocol: 'mailto:' }),
      derives: (claimed, delegated) => {
        /** @type {"account/register"} */
        const c1 = claimed.can
        /** @type {"account/register"} */
        const c2 = delegated.can

        return claimed.with === delegated.with
          ? ok({})
          : fail(`'${claimed.with}' != '${delegated.with}'`)
      },
    }),
    derives: (claimed, delegated) => {
      /** @type {"account/register"} */
      const c1 = claimed.can
      /** @type {"account/verify"} */
      const c2 = delegated.can

      return claimed.with === delegated.with
        ? ok({})
        : fail(`'${claimed.with}' != '${delegated.with}'`)
    },
  })

  const d1 = delegate([
    {
      can: 'account/register',
      with: 'mailto:zAlice@web.mail',
    },
  ])

  const regs = register.select(d1)

  assert.containSubset(
    regs,
    {
      matches: [
        {
          source: [d1[0]],
          value: {
            can: 'account/register',
            with: 'mailto:zAlice@web.mail',
          },
        },
      ],
      unknown: [],
      errors: [],
    },
    'selects registration capability'
  )

  const d2 = delegate([
    {
      can: 'account/register',
      with: 'did:key:zAlice',
    },
  ])

  assert.containSubset(register.select(d2), {
    matches: [],
    errors: [
      {
        name: 'InvalidClaim',
        context: {
          can: 'account/register',
        },
        causes: [
          {
            name: 'MalformedCapability',
            capability: {
              can: 'account/register',
              with: 'did:key:zAlice',
            },
            cause: {
              message: `Expected mailto: URI instead got did:key:zAlice`,
            },
          },
        ],
      },
    ],
    unknown: [],
  })

  const [reg] = regs.matches

  const d3 = delegate([
    {
      can: 'account/verify',
      with: 'mailto:zAlice@web.mail',
    },
  ])

  assert.containSubset(
    reg.select(d3),
    {
      matches: [
        {
          source: [d3[0]],
          value: {
            can: 'account/verify',
            with: 'mailto:zAlice@web.mail',
          },
        },
      ],
      unknown: [],
      errors: [],
    },
    'matches verification'
  )

  const d4 = delegate([
    {
      can: 'account/verify',
      with: 'mailto:bob@web.mail',
    },
  ])

  assert.containSubset(
    reg.select(d4),
    {
      matches: [],
      unknown: [],
      errors: [
        {
          name: 'InvalidClaim',
          context: {
            value: {
              can: 'account/register',
              with: 'mailto:zAlice@web.mail',
            },
          },
          causes: [
            {
              name: 'EscalatedCapability',
              claimed: {
                can: 'account/register',
                with: 'mailto:zAlice@web.mail',
              },
              delegated: {
                can: 'account/verify',
                with: 'mailto:bob@web.mail',
              },
              cause: {
                message: `'mailto:zAlice@web.mail' != 'mailto:bob@web.mail'`,
              },
            },
          ],
        },
      ],
    },
    'does not match on different email'
  )

  const d5 = delegate([
    {
      can: 'account/register',
      with: 'mailto:zAlice@web.mail',
    },
  ])

  assert.containSubset(
    reg.select(d5),
    {
      matches: [
        {
          value: {
            can: 'account/register',
            with: 'mailto:zAlice@web.mail',
          },
        },
      ],
      unknown: [],
      errors: [],
    },
    'normal delegation also works'
  )

  const registration = {
    can: the('account/register'),
    with: the('mailto:zAlice@web.mail'),
  }
  const verification = {
    can: the('account/verify'),
    with: the('mailto:zAlice@web.mail'),
  }

  const d6 = delegate([verification])
  assert.containSubset(
    register
      .select(delegate([registration]))
      .matches[0].select(delegate([registration]))
      .matches[0].select(delegate([registration]))
      .matches[0].select(delegate([registration]))
      .matches[0].select(delegate([verification]))
      .matches[0].select(d6),
    {
      matches: [
        {
          source: [d6[0]],
          value: {
            can: 'account/verify',
            with: 'mailto:zAlice@web.mail',
          },
        },
      ],
      unknown: [],
      errors: [],
    },
    'derived capability is recursive'
  )

  assert.containSubset(
    register
      .select(delegate([registration]))
      .matches[0].select(delegate([verification]))
      .matches[0].select(delegate([registration])),
    {
      matches: [],
      unknown: [registration],
      errors: [],
    },
    'deriviation is works one way'
  )
})

test('capability amplification', () => {
  const read = capability({
    can: 'file/read',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const write = capability({
    can: 'file/write',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const readwrite = read.and(write).derive({
    to: capability({
      can: 'file/read+write',
      with: URI.match({ protocol: 'file:' }),
      derives: (claimed, delegated) =>
        claimed.with.startsWith(delegated.with)
          ? ok({})
          : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
    }),
    derives: (claimed, [read, write]) => {
      if (!claimed.with.startsWith(read.with)) {
        return fail(`'${claimed.with}' is not contained in '${read.with}'`)
      } else if (!claimed.with.startsWith(write.with)) {
        return fail(`'${claimed.with}' is not contained in '${write.with}'`)
      } else {
        return ok({})
      }
    },
  })

  const d1 = delegate([
    { can: 'file/read', with: 'file:///home/zAlice/' },
    { can: 'file/write', with: 'file:///home/zAlice/' },
  ])

  assert.containSubset(
    readwrite.select(d1),
    {
      matches: [],
      errors: [],
      unknown: [
        { can: 'file/read', with: 'file:///home/zAlice/' },
        { can: 'file/write', with: 'file:///home/zAlice/' },
      ],
    },
    'expects derived capability read+write'
  )

  const d2 = delegate([
    { can: 'file/read+write', with: 'file:///home/zAlice/public' },
    { can: 'file/write', with: 'file:///home/zAlice/' },
  ])

  const selected = readwrite.select(d2)

  assert.containSubset(
    selected,
    {
      matches: [
        {
          source: [d2[0]],
          value: {
            can: 'file/read+write',
            with: 'file:///home/zAlice/public',
          },
        },
      ],
      errors: [],
      unknown: [{ can: 'file/write', with: 'file:///home/zAlice/' }],
    },
    'only selected matched'
  )

  const [rw] = selected.matches

  const d3 = delegate([
    { can: 'file/read+write', with: 'file:///home/zAlice/public' },
  ])

  assert.containSubset(
    rw.select(d3),
    {
      matches: [
        {
          source: [d3[0]],
          value: {
            can: 'file/read+write',
            with: 'file:///home/zAlice/public',
          },
        },
      ],
      errors: [],
      unknown: [],
    },
    'can derive from matching'
  )

  const d4 = delegate([
    { can: 'file/read+write', with: 'file:///home/zAlice/public/photos' },
  ])

  assert.containSubset(
    rw.select(d4),
    {
      matches: [],
      unknown: [],
      errors: [
        {
          name: 'InvalidClaim',
          context: {
            value: {
              can: 'file/read+write',
              with: 'file:///home/zAlice/public',
            },
          },
          causes: [
            {
              name: 'EscalatedCapability',
              claimed: {
                can: 'file/read+write',
                with: 'file:///home/zAlice/public',
              },
              delegated: {
                can: 'file/read+write',
                with: 'file:///home/zAlice/public/photos',
              },
              cause: {
                message: `'file:///home/zAlice/public' is not contained in 'file:///home/zAlice/public/photos'`,
              },
            },
          ],
        },
      ],
    },
    'can not derive from escalated path'
  )

  const d5 = delegate([
    { can: 'file/read+write', with: 'file:///home/zAlice/' },
  ])

  assert.containSubset(
    rw.select(d5),
    {
      matches: [
        {
          source: [d5[0]],
          value: {
            can: 'file/read+write',
            with: 'file:///home/zAlice/',
          },
        },
      ],
      unknown: [],
      errors: [],
    },
    'can derive from greater capabilities'
  )

  const d6 = delegate([
    { can: 'file/read', with: 'file:///home/zAlice/' },
    { can: 'file/write', with: 'file:///home/zAlice/public' },
  ])

  const rnw = rw.select(d6)

  assert.containSubset(
    rnw,
    {
      matches: [
        {
          source: [d6[0], d6[1]],
          value: [
            {
              can: 'file/read',
              with: 'file:///home/zAlice/',
            },
            {
              can: 'file/write',
              with: 'file:///home/zAlice/public',
            },
          ],
        },
      ],
      unknown: [],
      errors: [],
    },
    'can derive amplification'
  )

  const [reandnwrite] = rnw.matches

  const d7 = delegate([
    { can: 'file/read', with: 'file:///home/zAlice/' },
    { can: 'file/write', with: 'file:///home/zAlice/' },
  ])

  assert.containSubset(
    reandnwrite.select(d7),
    {
      matches: [
        {
          source: [d7[0], d7[1]],
          value: [
            {
              can: 'file/read',
              with: 'file:///home/zAlice/',
            },
            {
              can: 'file/write',
              with: 'file:///home/zAlice/',
            },
          ],
        },
      ],
      unknown: [],
      errors: [],
    },
    'can derive amplification'
  )

  const d8 = delegate([
    { can: 'file/read', with: 'file:///home/zAlice/public/photos/' },
    { can: 'file/write', with: 'file:///home/zAlice/public' },
  ])

  assert.containSubset(
    rw.select(d8),
    {
      matches: [],
      unknown: [],
      errors: [
        {
          name: 'InvalidClaim',
          context: {
            value: {
              can: 'file/read+write',
              with: 'file:///home/zAlice/public',
            },
          },
          causes: [
            {
              name: 'EscalatedCapability',
              claimed: {
                can: 'file/read+write',
                with: 'file:///home/zAlice/public',
              },
              delegated: [
                {
                  can: 'file/read',
                  with: 'file:///home/zAlice/public/photos/',
                },
                {
                  can: 'file/write',
                  with: 'file:///home/zAlice/public',
                },
              ],
              cause: {
                message: `'file:///home/zAlice/public' is not contained in 'file:///home/zAlice/public/photos/'`,
              },
            },
          ],
        },
      ],
    },
    'can derive amplification'
  )

  const [r1, w1] = delegate([
    { can: 'file/read', with: 'file:///home/zAlice/' },
    { can: 'file/write', with: 'file:///home/zAlice/' },
  ])

  const [r2] = delegate([{ can: 'file/read', with: 'file:///home/' }])

  assert.containSubset(
    reandnwrite.select([r1, w1, r2]),
    {
      matches: [
        {
          source: [r1, w1],
          value: [
            {
              can: 'file/read',
              with: 'file:///home/zAlice/',
            },
            {
              can: 'file/write',
              with: 'file:///home/zAlice/',
            },
          ],
        },
        {
          source: [r2, w1],
          value: [
            {
              can: 'file/read',
              with: 'file:///home/',
            },
            {
              can: 'file/write',
              with: 'file:///home/zAlice/',
            },
          ],
        },
      ],
      unknown: [],
      errors: [],
    },
    'selects all combinations'
  )
})

test('capability or combinator', () => {
  const read = capability({
    can: 'file/read',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const write = capability({
    can: 'file/write',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const readwrite = read.or(write)

  const [r, w] = delegate([
    { can: 'file/read', with: 'file:///home/zAlice/' },
    { can: 'file/write', with: 'file:///home/zAlice/' },
  ])

  const selection = readwrite.select([r, w])

  assert.containSubset(
    selection,
    {
      matches: [
        {
          source: [r],
          value: {
            can: 'file/read',
            with: 'file:///home/zAlice/',
          },
        },
        {
          source: [w],
          value: {
            can: 'file/write',
            with: 'file:///home/zAlice/',
          },
        },
      ],
      errors: [],
      unknown: [],
    },
    'matches both capabilities'
  )
})

test('parse with nb', () => {
  const storeAdd = capability({
    can: 'store/add',
    with: URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      link: Link.optional(),
    }),
    derives: (claimed, delegated) => {
      if (claimed.with !== delegated.with) {
        return fail(
          `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
        )
      } else if (
        delegated.nb.link &&
        `${delegated.nb.link}` !== `${claimed.nb.link}`
      ) {
        return fail(
          `Link ${
            claimed.nb.link == null ? '' : `${claimed.nb.link} `
          }violates imposed ${delegated.nb.link} constraint`
        )
      } else {
        return ok({})
      }
    },
  })

  const v1 = storeAdd.select(
    delegate([{ can: 'store/add', with: 'did:key:zAlice', nb: { link: 5 } }])
  )

  assert.containSubset(v1, {
    matches: [],
    unknown: [],
    errors: [
      {
        name: 'InvalidClaim',
        context: {
          can: 'store/add',
        },
        causes: [
          {
            name: 'MalformedCapability',
            capability: {
              can: 'store/add',
              with: 'did:key:zAlice',
              nb: { link: 5 },
            },
            cause: {
              name: 'FieldError',
              cause: {
                message: 'Expected link to be a CID instead of 5',
              },
            },
          },
        ],
      },
    ],
  })

  const v2 = storeAdd.select(
    delegate([{ can: 'store/add', with: 'did:key:zAlice' }])
  )

  assert.containSubset(v2, {
    unknown: [],
    errors: [],
    matches: [
      {
        value: {
          can: 'store/add',
          with: 'did:key:zAlice',
          nb: {},
        },
      },
    ],
  })

  const [match] = v2.matches

  const link1 = Link.parse(
    'bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4'
  )
  const link2 = Link.parse(
    'bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny'
  )

  const v3 = match.select(
    delegate([
      {
        can: 'store/add',
        with: 'did:key:zAlice',
        nb: {
          link: link1,
        },
      },
    ])
  )

  assert.containSubset(v3, {
    errors: [
      {
        name: 'InvalidClaim',
        context: {
          value: {
            can: 'store/add',
            with: 'did:key:zAlice',
            nb: {},
          },
        },
        causes: [
          {
            name: 'EscalatedCapability',
            claimed: {
              can: 'store/add',
              with: 'did:key:zAlice',
              nb: {},
            },
            delegated: {
              can: 'store/add',
              with: 'did:key:zAlice',
              nb: {
                link: link1,
              },
            },
            cause: {
              message: `Link violates imposed bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4 constraint`,
            },
          },
        ],
      },
    ],
    unknown: [],
    matches: [],
  })

  const v4 = storeAdd.select(
    delegate([
      {
        can: 'store/add',
        with: 'did:key:zAlice',
        nb: {
          link: link1,
        },
      },
    ])
  )
  const [match2] = v4.matches

  const v5 = match2.select(
    delegate([
      {
        can: 'store/add',
        with: 'did:key:zAlice',
        nb: {
          link: link1,
        },
      },
    ])
  )

  assert.containSubset(v5, {
    unknown: [],
    errors: [],
    matches: [
      {
        value: {
          can: 'store/add',
          with: 'did:key:zAlice',
          nb: {
            link: link1,
          },
        },
      },
    ],
  })

  const v6 = match2.select(
    delegate([
      {
        can: 'store/add',
        with: 'did:key:zAlice',
        nb: {
          link: link2,
        },
      },
    ])
  )

  assert.containSubset(v6, {
    errors: [
      {
        name: 'InvalidClaim',
        context: {
          value: {
            can: 'store/add',
            with: 'did:key:zAlice',
            nb: {
              link: link1,
            },
          },
        },
        causes: [
          {
            name: 'EscalatedCapability',
            claimed: {
              can: 'store/add',
              with: 'did:key:zAlice',
              nb: {
                link: link1,
              },
            },
            delegated: {
              can: 'store/add',
              with: 'did:key:zAlice',
              nb: {
                link: link2,
              },
            },
            cause: {
              message: `Link bafybeiabis2rrk6m3p7xghz42hi677ectmzqxsvz26icxxs7digddgpbr4 violates imposed bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny constraint`,
            },
          },
        ],
      },
    ],
    unknown: [],
    matches: [],
  })
})

test('and prune', () => {
  const read = capability({
    can: 'file/read',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const write = capability({
    can: 'file/write',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const readwrite = read.and(write)
  const v1 = readwrite.select(
    delegate(
      [
        { can: 'file/read', with: `file:///${alice.did()}/public` },
        { can: 'file/write', with: `file:///${bob.did()}/@alice` },
      ],
      { issuer: alice }
    )
  )

  assert.containSubset(v1, {
    matches: [
      {
        value: [
          { can: 'file/read', with: `file:///${alice.did()}/public` },
          { can: 'file/write', with: `file:///${bob.did()}/@alice` },
        ],
      },
    ],
  })

  const [match] = v1.matches
  const matchwrite = match.prune({
    canIssue: (capabality, issuer) =>
      capabality.with.startsWith(`file:///${issuer}`),
  })

  const v2 = matchwrite?.select(
    delegate([{ can: 'file/write', with: `file:///${bob.did()}/@alice` }], {
      issuer: bob.verifier,
    })
  )

  assert.containSubset(v2, {
    matches: [
      {
        value: [{ can: 'file/write', with: `file:///${bob.did()}/@alice` }],
      },
    ],
  })

  const none = v2?.matches[0].prune({
    canIssue: (capabality, issuer) =>
      capabality.with.startsWith(`file:///${issuer}`),
  })

  assert.equal(none, null)
})

test('toString methods', () => {
  const read = capability({
    can: 'file/read',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  const write = capability({
    can: 'file/write',
    with: URI.match({ protocol: 'file:' }),
    derives: (claimed, delegated) =>
      claimed.with.startsWith(delegated.with)
        ? ok({})
        : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
  })

  assert.equal(read.toString(), '{"can":"file/read"}')

  {
    // @ts-expect-error it needs more props but we can ignore that
    const match = read.match({
      capability: {
        can: 'file/read',
        with: `file:///home/alice`,
      },
    })
    assert.equal(
      `${match.ok}`,
      `{"can":"file/read","with":"file:///home/alice"}`
    )
  }

  const readwrite = read.and(write)
  assert.equal(
    readwrite.toString(),
    '[{"can":"file/read"}, {"can":"file/write"}]'
  )
  {
    const {
      matches: [match],
    } = readwrite.select(
      delegate([
        {
          can: 'file/read',
          with: `file:///home/alice`,
        },
        {
          can: 'file/write',
          with: `file:///home/alice`,
        },
      ])
    )

    assert.equal(
      match.toString(),
      '[{"can":"file/read","with":"file:///home/alice"}, {"can":"file/write","with":"file:///home/alice"}]'
    )
  }

  const readorwrite = read.or(write)
  assert.equal(
    readorwrite.toString(),
    '{"can":"file/read"}|{"can":"file/write"}'
  )

  const rw = readwrite.derive({
    to: capability({
      can: 'file/read+write',
      with: URI.match({ protocol: 'file:' }),
      derives: (claimed, delegated) =>
        claimed.with.startsWith(delegated.with)
          ? ok({})
          : fail(`'${claimed.with}' is not contained in '${delegated.with}'`),
    }),
    derives: (claimed, [read, write]) => {
      if (!claimed.with.startsWith(read.with)) {
        return fail(`'${claimed.with}' is not contained in '${read.with}'`)
      } else if (!claimed.with.startsWith(write.with)) {
        return fail(`'${claimed.with}' is not contained in '${write.with}'`)
      } else {
        return ok({})
      }
    },
  })

  assert.equal(rw.toString(), '{"can":"file/read+write"}')
  {
    // @ts-expect-error it needs more props but we can ignore that
    const match = rw.match({
      capability: {
        can: 'file/read+write',
        with: `file:///home/alice`,
      },
    })

    assert.equal(
      `${match.ok}`,
      `{"can":"file/read+write","with":"file:///home/alice"}`
    )
  }
})

test('capability create with nb', () => {
  const data = URI.match({ protocol: 'data:' })
  const echo = capability({
    can: 'test/echo',
    with: URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      message: URI.match({ protocol: 'data:' }),
    }),
  })

  assert.throws(() => {
    echo.create({
      // @ts-expect-error - not assignable to did:
      with: 'file://gozala/path',
      nb: {
        message: 'data:hello',
      },
      bar: 1,
    })
  }, /Invalid 'with' - Expected did: URI/)

  assert.throws(() => {
    // @ts-expect-error
    echo.create({
      with: alice.did(),
    })
  }, /Expected URI but got undefined/)

  assert.throws(() => {
    echo.create({
      with: alice.did(),
      nb: {
        // @ts-expect-error
        message: 'echo:foo',
      },
    })
  }, /Expected data: URI instead got echo:foo/)

  assert.deepEqual(
    echo.create({ with: alice.did(), nb: { message: 'data:hello' } }),
    {
      can: 'test/echo',
      with: alice.did(),
      nb: {
        message: 'data:hello',
      },
    }
  )

  assert.deepEqual(
    echo.create({
      // @ts-expect-error - must be a string
      with: new URL(alice.did()),
      nb: { message: 'data:hello' },
    }),
    {
      can: 'test/echo',
      with: alice.did(),
      nb: {
        message: 'data:hello',
      },
    }
  )
})

test('capability create without nb', () => {
  const ping = capability({
    can: 'test/ping',
    with: URI.match({ protocol: 'did:' }),
  })

  assert.throws(() => {
    ping.create({
      // @ts-expect-error - not assignable to did:
      with: 'file://gozala/path',
    })
  }, /Invalid 'with' - Expected did: URI/)

  assert.deepEqual(
    ping.create({
      with: alice.did(),
    }),
    {
      can: 'test/ping',
      with: alice.did(),
    }
  )

  assert.deepEqual(
    ping.create({
      with: alice.did(),
      // @ts-expect-error - no nb expected
      nb: { x: 1 },
    }),
    {
      can: 'test/ping',
      with: alice.did(),
    }
  )

  assert.deepEqual(
    ping.create({
      with: alice.did(),
    }),
    {
      can: 'test/ping',
      with: alice.did(),
    }
  )
})

test('invoke capability (without nb)', () => {
  const ping = capability({
    can: 'test/ping',
    with: URI.match({ protocol: 'did:' }),
  })

  assert.throws(() => {
    ping.invoke({
      issuer: alice,
      audience: w3,
      // @ts-expect-error - not assignable to did:
      with: 'file://gozala/path',
    })
  }, /Invalid 'with' - Expected did: URI/)

  const a = invoke({
    issuer: alice,
    audience: w3,
    capability: {
      can: 'test/ping',
      with: alice.did(),
    },
  })

  assert.deepEqual(
    ping.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/ping',
        with: alice.did(),
      },
    })
  )

  assert.deepEqual(
    ping.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      // @ts-expect-error - no nb expected
      nb: { x: 1 },
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/ping',
        with: alice.did(),
      },
    })
  )

  assert.deepEqual(
    ping.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: undefined,
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/ping',
        with: alice.did(),
      },
    })
  )

  assert.deepEqual(
    ping.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      // @ts-expect-error - no nb expected
      nb: {},
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/ping',
        with: alice.did(),
      },
    })
  )

  assert.deepEqual(
    ping.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/ping',
        with: alice.did(),
      },
    })
  )
})

test('invoke capability (with nb)', () => {
  const echo = capability({
    can: 'test/echo',
    with: URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      message: URI.match({ protocol: 'data:' }),
    }),
  })

  assert.throws(() => {
    echo.invoke({
      issuer: alice,
      audience: w3,
      // @ts-expect-error - not assignable to did:
      with: 'file://gozala/path',
      nb: {
        message: 'data:hello',
      },
    })
  }, /Invalid 'with' - Expected did: URI/)

  assert.throws(() => {
    // @ts-expect-error
    echo.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
    })
  }, /Expected URI but got undefined/)

  assert.throws(() => {
    echo.create({
      with: alice.did(),
      nb: {
        // @ts-expect-error
        message: 'echo:foo',
      },
    })
  }, /Expected data: URI instead got echo:foo/)

  assert.deepEqual(
    echo.invoke({
      issuer: alice,
      audience: w3,
      with: alice.did(),
      nb: { message: 'data:hello' },
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/echo',
        with: alice.did(),
        nb: {
          message: /** @type {'data:hello'} */ ('data:hello'),
        },
      },
    })
  )

  assert.deepEqual(
    echo.invoke({
      issuer: alice,
      audience: w3,
      // @ts-expect-error - must be a string
      with: new URL(alice.did()),
      nb: { message: 'data:hello' },
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'test/echo',
        with: alice.did(),
        nb: {
          message: /** @type {'data:hello'} */ ('data:hello'),
        },
      },
    })
  )
})

test('capability with optional caveats', async () => {
  const Echo = capability({
    can: 'test/echo',
    with: URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      message: URI.match({ protocol: 'data:' }),
      meta: Link.optional(),
    }),
  })

  const echo = await Echo.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'data:hello',
    },
  }).delegate()

  assert.deepEqual(echo.capabilities, [
    {
      can: 'test/echo',
      with: alice.did(),
      nb: {
        message: 'data:hello',
      },
    },
  ])

  const link = parseLink('bafkqaaa')
  const out = await Echo.invoke({
    issuer: alice,
    audience: w3,
    with: alice.did(),
    nb: {
      message: 'data:hello',
      meta: link,
    },
  }).delegate()

  assert.deepEqual(out.capabilities, [
    {
      can: 'test/echo',
      with: alice.did(),
      nb: {
        message: 'data:hello',
        meta: link,
      },
    },
  ])
})

test('and chain', () => {
  const A = capability({
    can: 'test/a',
    with: URI,
  })

  const B = capability({
    can: 'test/b',
    with: URI,
  })

  const C = capability({
    can: 'test/c',
    with: URI,
  })

  const ABC = A.and(B).and(C)

  const cap = ABC.derive({
    to: capability({
      can: 'test/abc',
      with: URI,
    }),
    derives: (abc, [a, b, c]) => {
      return abc.with !== a.with
        ? fail(`${abc.with} != ${a.with}`)
        : abc.with !== b.with
        ? fail(`${abc.with} != ${b.with}`)
        : abc.with !== c.with
        ? fail(`${abc.with} != ${c.with}`)
        : ok({})
    },
  })

  const d1 = delegate([{ can: 'test/abc', with: 'file:///test' }])

  const d2 = delegate([
    { can: 'test/c', with: 'file:///test' },
    { can: 'test/a', with: 'file:///test' },
    { can: 'test/b', with: 'file:///test' },
  ])

  assert.containSubset(
    ABC.match(source({ can: 'test/c', with: 'file:///test' })),
    {
      error: {},
    }
  )

  assert.containSubset(ABC.select(d2), {
    unknown: [],
    errors: [],
    matches: [
      {
        matches: [
          { value: { can: 'test/c', with: 'file:///test' } },
          { value: { can: 'test/a', with: 'file:///test' } },
          { value: { can: 'test/b', with: 'file:///test' } },
        ],
      },
    ],
  })
})

test('.and(...).match', () => {
  const A = capability({
    can: 'test/ab',
    with: URI,
    nb: Schema.struct({
      a: Schema.Text,
    }),
  })

  const B = capability({
    can: 'test/ab',
    with: URI,
    nb: Schema.struct({
      b: Schema.Text,
    }),
  })

  const AB = A.and(B)
  const m = AB.match(
    source({
      can: 'test/ab',
      with: 'data:1',
      nb: {
        a: 'a',
        b: 'b',
      },
    })
  )

  if (m.error) {
    return assert.fail(m.error.message)
  }

  assert.containSubset(AB.select([]), {
    unknown: [],
    errors: [],
    matches: [],
  })

  const src = delegate([
    { can: 'test/ab', with: 'data:1', nb: { a: 'a' } },
    { can: 'test/ab', with: 'data:1', nb: { a: 'A', b: 'b' } },
  ])

  assert.containSubset(m.ok.select(src), {
    unknown: [],
    errors: [
      {
        name: 'InvalidClaim',
        cause: {
          name: 'EscalatedCapability',
          message: 'Constraint violation: a: a violates A',
        },
      },
    ],
    matches: [
      {
        matches: [
          {
            value: {
              can: 'test/ab',
              with: 'data:1',
              nb: { a: 'a' },
            },
          },
          {
            value: {
              can: 'test/ab',
              with: 'data:1',
              nb: { b: 'b' },
            },
          },
        ],
      },
    ],
  })
})

test('A.or(B).match', () => {
  const A = capability({
    can: 'test/a',
    with: URI,
  })

  const B = capability({
    can: 'test/b',
    with: URI,
  })

  const AB = A.or(B)

  const ab = AB.match(source({ can: 'test/c', with: 'data:0' }))
  assert.containSubset(ab, {
    error: {
      name: 'UnknownCapability',
    },
  })

  assert.containSubset(
    AB.match(
      source({
        can: 'test/b',
        // @ts-expect-error - not a URI
        with: 'hello',
      })
    ),
    {
      error: {
        name: 'MalformedCapability',
      },
    }
  )
})

test('and with diff nb', () => {
  const A = capability({
    can: 'test/me',
    with: URI,
    nb: Schema.struct({
      a: Schema.Text,
    }),
  })

  const B = capability({
    can: 'test/me',
    with: URI,
    nb: Schema.struct({
      b: Schema.Text,
    }),
  })

  const AB = A.and(B)

  assert.containSubset(AB.match(source({ can: 'test/me', with: 'data:1' })), {
    error: {
      name: 'MalformedCapability',
    },
  })
  assert.containSubset(
    AB.match(source({ can: 'test/me', with: 'data:1', nb: { a: 'a' } })),
    {
      error: {
        name: 'MalformedCapability',
      },
    }
  )
  assert.containSubset(
    AB.match(source({ can: 'test/me', with: 'data:1', nb: { b: 'b' } })),
    {
      error: {
        name: 'MalformedCapability',
      },
    }
  )

  const proof = { this: { is: 'proof' } }

  assert.containSubset(
    AB.match(
      source({ can: 'test/me', with: 'data:1', nb: { a: 'a', b: 'b' } }, proof)
    ),
    {
      ok: {
        proofs: [proof],
        matches: [
          { value: { can: 'test/me', with: 'data:1', nb: { a: 'a' } } },
          { value: { can: 'test/me', with: 'data:1', nb: { b: 'b' } } },
        ],
      },
    }
  )
})

test('derived capability DSL', () => {
  const A = capability({
    can: 'invoke/a',
    with: Schema.URI,
  })

  const AA = A.derive({
    to: capability({
      can: 'derive/a',
      with: Schema.URI,
    }),
    derives: (b, a) => (b.with === a.with ? ok({}) : fail(`with don't match`)),
  })

  assert.deepEqual(
    AA.create({
      with: 'data:a',
    }),
    {
      can: 'derive/a',
      with: 'data:a',
    }
  )

  assert.deepEqual(
    AA.invoke({
      audience: w3,
      issuer: alice,
      with: alice.did(),
    }),
    invoke({
      issuer: alice,
      audience: w3,
      capability: {
        can: 'derive/a',
        with: alice.did(),
      },
    })
  )
})

test('capability match', () => {
  const a = capability({ can: 'test/a', with: Schema.URI })

  const proof = {
    fake: { thing: 'thing' },
  }

  const m = a.match(source({ can: 'test/a', with: 'data:a' }, proof))
  assert.containSubset(m, {
    ok: {
      can: 'test/a',
      proofs: [proof],
    },
  })

  assert.equal(
    `${m.ok}`,
    JSON.stringify({
      can: 'test/a',
      with: 'data:a',
    })
  )

  const m2 = a.match(source({ can: 'test/a', with: 'data:a', nb: {} }, proof))
  assert.equal(
    `${m2.ok}`,
    JSON.stringify({
      can: 'test/a',
      with: 'data:a',
    })
  )

  const echo = capability({
    can: 'test/echo',
    with: URI.match({ protocol: 'did:' }),
    nb: Schema.struct({
      message: URI.match({ protocol: 'data:' }),
    }),
  })

  const m3 = echo.match(
    source(
      {
        can: 'test/echo',
        with: alice.did(),
        nb: { message: 'data:hello' },
      },
      proof
    )
  )

  assert.containSubset(m3, {
    ok: {
      can: 'test/echo',
      value: {
        can: 'test/echo',
        with: alice.did(),
        nb: { message: 'data:hello' },
      },
      proofs: [proof],
    },
  })

  assert.equal(
    `${m3.ok}`,
    JSON.stringify({
      can: 'test/echo',
      with: alice.did(),
      nb: { message: 'data:hello' },
    })
  )
})

test('derived capability match & select', () => {
  const A = capability({
    can: 'invoke/a',
    with: Schema.URI,
  })

  const AA = A.derive({
    to: capability({
      can: 'derive/a',
      with: Schema.URI,
    }),
    derives: (b, a) => (b.with === a.with ? ok({}) : fail(`with don't match`)),
  })

  assert.equal(AA.can, 'derive/a')

  const proof = {
    issuer: alice,
    fake: { thing: 'thing' },
  }
  const src = source({ can: 'derive/a', with: 'data:a' }, proof)
  const m = AA.match(src)

  assert.containSubset(m, {
    ok: {
      can: 'derive/a',
      proofs: [proof],
      value: { can: 'derive/a', with: 'data:a' },
      source: [src],
    },
  })

  if (m.error) {
    return assert.fail(m.error.message)
  }

  assert.notEqual(m.ok.prune({ canIssue: () => false }), null)
  assert.equal(m.ok.prune({ canIssue: () => true }), null)
})

test('default derive', () => {
  const a = capability({
    can: 'test/a',
    with: Schema.URI.match({ protocol: 'file:' }),
  })

  const home = a.match(
    source({ can: 'test/a', with: 'file:///home/bob/photo' })
  )
  if (home.error) {
    return assert.fail(home.error.message)
  }

  assert.containSubset(
    home.ok.select(
      delegate([
        {
          can: 'test/a',
          with: 'file:///home/alice/*',
        },
      ])
    ),
    {
      matches: [],
      unknown: [],
      errors: [
        {
          name: 'InvalidClaim',
          cause: {
            name: 'EscalatedCapability',
            message:
              'Constraint violation: Resource file:///home/bob/photo does not match delegated file:///home/alice/* ',
          },
        },
      ],
    }
  )

  assert.containSubset(
    home.ok.select(
      delegate([
        {
          can: 'test/a',
          with: 'file:///home/bob/*',
        },
      ])
    ),
    {
      matches: [
        {
          can: 'test/a',
          value: {
            can: 'test/a',
            with: 'file:///home/bob/*',
            nb: {},
          },
        },
      ],
      unknown: [],
      errors: [],
    }
  )

  assert.containSubset(
    home.ok.select(
      delegate([
        {
          can: 'test/a',
          with: 'file:///home/alice/',
        },
      ])
    ),
    {
      matches: [],
      unknown: [],
      errors: [
        {
          name: 'InvalidClaim',
          cause: {
            name: 'EscalatedCapability',
            message:
              'Constraint violation: Resource file:///home/bob/photo is not contained by file:///home/alice/',
          },
        },
      ],
    }
  )
})

test('default derive with nb', () => {
  const Profile = capability({
    can: 'profile/set',
    with: Schema.URI.match({ protocol: 'file:' }),
    nb: Schema.struct({
      mime: Schema.Text,
    }),
  })

  const pic = Profile.match(
    source({
      can: 'profile/set',
      with: 'file:///home/alice/photo',
      nb: { mime: 'image/png' },
    })
  )

  if (pic.error) {
    return assert.fail(pic.error.message)
  }

  assert.containSubset(
    pic.ok.select(
      delegate([
        {
          can: 'profile/set',
          with: 'file:///home/alice/photo',
          nb: { mime: 'image/jpeg' },
        },
      ])
    ),
    {
      matches: [],
      unknown: [],
      errors: [
        {
          name: 'InvalidClaim',
          cause: {
            name: 'EscalatedCapability',
            message:
              'Constraint violation: mime: image/png violates image/jpeg',
          },
        },
      ],
    }
  )
})

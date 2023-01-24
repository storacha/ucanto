import { test, assert } from './test.js'
import * as Protocol from '../src/protocol.js'
import { capability, Failure, Schema } from '../src/lib.js'
import * as API from '@ucanto/interface'
import { equalWith, equalLink } from './util.js'

/**
 * Represents the top `{ can: '*', with: 'did:key:zAlice' }` capability, which we often
 * also call account linking.
 *
 * @see {@link https://github.com/ucan-wg/spec#52-top}
 */
export const top = capability({
  can: '*',
  with: Schema.DID,
})

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `store/` prefixed capability for the (memory) space identified
 * by did:key in the `with` field.
 */
export const store = top.derive({
  to: capability({
    can: 'store/*',
    /**
     * did:key identifier of the (memory) space where CAR is intended to
     * be stored.
     */
    with: Schema.DID,
  }),
  /**
   * `store/*` can be derived from the `*` capability as long as `with` field
   * is the same.
   */
  derives: equalWith,
})

// Right now ucanto does not yet has native `*` support, which means
// `store/add` can not be derived from `*` event though it can be
// derived from `store/*`. As a workaround we just define base capability
// here so all store capabilities could be derived from either `*` or
// `store/*`.
const base = top.or(store)

const add = base.derive({
  to: capability({
    can: 'store/add',
    /**
     * did:key identifier of the (memory) space where CAR is intended to
     * be stored.
     */
    with: Schema.DID,
    nb: {
      /**
       * CID of the CAR file to be stored. Service will provision write target
       * for this exact CAR file for agent to PUT or POST it. Attempt to write
       * any other content will fail.
       */
      link: Schema.Link,
      /**
       * Size of the CAR file to be stored. Service will provision write target
       * for this exact size. Attempt to write a larger CAR file will fail.
       */
      size: Schema.integer(),
      /**
       * Agent may optionally provide a link to a related CAR file using `origin`
       * field. This is useful when storing large DAGs, agent could shard it
       * across multiple CAR files and then link each shard with a previous one.
       *
       * Providing this relation tells service that given CAR is shard of the
       * larger DAG as opposed to it being intentionally partial DAG. When DAG is
       * not sharded, there will be only one `store/add` with `origin` left out.
       */
      origin: Schema.Link.optional(),
    },
    derives: (claim, from) => {
      const result = equalLink(claim, from)
      if (result.error) {
        return result
      } else if (claim.nb.size !== undefined && from.nb.size !== undefined) {
        return claim.nb.size > from.nb.size
          ? new Failure(
              `Size constraint violation: ${claim.nb.size} > ${from.nb.size}`
            )
          : true
      } else {
        return true
      }
    },
  }),
  /**
   * `store/add` can be derived from the `store/*` & `*` capability
   * as long as the `with` fields match.
   */
  derives: equalWith,
})

/**
 * Capability can be used to remove the stored CAR file from the (memory)
 * space identified by `with` field.
 */
export const remove = base.derive({
  to: capability({
    can: 'store/remove',
    /**
     * did:key identifier of the (memory) space where CAR is intended to
     * be stored.
     */
    with: URI.match({ protocol: 'did:' }),
    nb: {
      /**
       * CID of the CAR file to be removed from the store.
       */
      link: Link,
    },
    derives: equalLink,
  }),
  /**
   * `store/remove` can be derived from the `store/*` & `*` capability
   * as long as the `with` fields match.
   */
  derives: equalWith,
})

/**
 * Capability can be invoked to request a list of stored CAR files in the
 * (memory) space identified by `with` field.
 */
export const list = base.derive({
  to: capability({
    can: 'store/list',
    /**
     * did:key identifier of the (memory) space where CAR is intended to
     * be stored.
     */
    with: URI.match({ protocol: 'did:' }),
    nb: {
      /**
       * A pointer that can be moved back and forth on the list.
       * It can be used to paginate a list for instance.
       */
      cursor: Schema.string().optional(),
      /**
       * Maximum number of items per page.
       */
      size: Schema.integer().optional(),
    },
    derives: (claimed, delegated) => {
      if (claimed.with !== delegated.with) {
        return new Failure(
          `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
        )
      }
      return true
    },
  }),
  /**
   * `store/list` can be derived from the `store/*` & `*` capability
   * as long as the `with` fields match.
   */
  derives: equalWith,
})

test('api', () => {
  const api = Protocol.protocol([
    Protocol.task({
      in: add,
      ok: Schema.struct({ link: Schema.Link }),
    }),
    Protocol.task({
      in: list,
      ok: Schema.struct({
        cursor: Schema.string().optional(),
        results: Schema.array(
          Schema.struct({
            link: Schema.Link,
            size: Schema.integer(),
          })
        ),
      }),
    }),
    Protocol.task({
      in: remove,
      ok: Schema.struct({}),
    }),
  ])

  const out = { ...api.out.read({}) }
})

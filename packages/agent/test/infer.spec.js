import * as API from '../src/api.js'
import { DID as Principal } from '@ucanto/core'
import { capability, Schema, DID, URI, Text, Link } from '@ucanto/validator'
import { ed25519 } from '@ucanto/principal'
import { CAR } from '@ucanto/transport'

const fail = Schema.struct({ error: true })

/**
 * @template T
 * @template {{}} [X={message:string}]
 * @param {Schema.Reader<T>} ok
 * @param {Schema.Reader<X>} error
 * @returns {Schema.Schema<API.Result<T & {error?: undefined}, X & { error: true }>>}
 */
const result = (ok, error = Schema.struct({ message: Schema.string() })) =>
  Schema.or(
    /** @type {Schema.Reader<T & {error?:never}>} */ (ok),
    fail.and(error)
  )

/**
 * @param {object} input
 * @param {API.AgentModule} input.Agent
 */
const testW3protocol = async ({ Agent }) => {
  const Space = DID.match({ method: 'key' })
  /**
   * Schema representing a link (a.k.a CID) to a CAR file. Enforces CAR codec code and CID v1.
   */
  const CARLink = Link.match({ code: CAR.codec.code, version: 1 })

  const Add = Schema.struct({
    link: CARLink,
    size: Schema.integer(),
    origin: Schema.Link.optional(),
  })

  const AddDone = Schema.struct({
    status: 'done',
    with: Space,
    link: CARLink,
  })

  // Should be a dict instead, workaround for now
  // https://github.com/web3-storage/ucanto/pull/192
  const headers = Schema.tuple([Schema.string(), Schema.string()]).array()

  const AddHandOff = Schema.struct({
    status: 'upload',
    with: Space,
    link: CARLink,
    url: Schema.URI,
    headers,
  })

  const SpaceHasNoStorageProvider = Schema.struct({
    name: 'SpaceHasNoStorageProvider',
  })
  const ExceedsStorageCapacity = Schema.struct({
    name: 'ExceedsStorageCapacity',
  })
  const MalformedCapability = Schema.struct({
    name: 'MalformedCapability',
  })
  const InvocationError = Schema.struct({
    name: 'InvocationError',
  })

  const AddError = SpaceHasNoStorageProvider.or(ExceedsStorageCapacity)
    .or(MalformedCapability)
    .or(InvocationError)

  const Remove = Schema.struct({
    link: Link,
  })

  const Cursor = Schema.struct({
    cursor: Schema.string().optional(),
    size: Schema.integer().optional(),
  })

  /**
   * @template T
   * @param {API.Reader<T>} result
   */
  const list = result =>
    Cursor.and(
      Schema.struct({
        results: Schema.array(result),
      })
    )

  const UploadRoot = Schema.struct({
    root: Schema.Link,
  })
  const UploadShards = Schema.struct({
    shards: CARLink.array().optional(),
  })

  const Upload = UploadRoot.and(UploadShards)
  const Unit = Schema.struct({})

  const store = Agent.resource(Space, {
    store: {
      _: Unit,
      add: Agent.task({
        in: Add,
        out: result(AddDone.or(AddHandOff), AddError),
      }),
      remove: Agent.task({
        in: Remove,
        out: result(Remove, MalformedCapability.or(InvocationError)),
      }),
      list: Agent.task({
        in: Cursor,
        out: result(list(Add), InvocationError),
      }),
    },
  })

  const upload = Agent.resource(Space, {
    upload: {
      _: Unit,
      add: Agent.task({
        in: Upload,
        out: result(Upload),
      }),
      remove: Agent.task({
        in: UploadRoot,
        out: result(Upload),
      }),
      list: Agent.task({
        in: Cursor,
        out: result(list(Upload)),
      }),
    },
  })

  const Info = Schema.struct({
    did: DID,
  })

  const debug = Agent.resource(Schema.URI, {
    debug: {
      info: Agent.task({ out: result(Info) }),
    },
  })

  const agent = Agent.create({
    authority: Principal.parse('did:web:web3.storage'),
    signer: await ed25519.generate(),
    delegations: [],
  })
    .init(async () => {
      return {
        password: 'secret',
      }
    })
    .provide(store, {
      store: {
        add: async (uri, input, context) => {
          return {
            status: 'done',
            link: input.link,
            with: uri,
          }
        },
        list: async (uri, input, context) => {
          return {
            results: [],
          }
        },
        remove: async (uri, input, context) => {
          return { link: input.link }
        },
        _: () => {
          throw new Error('Capability can not be invoked capability')
        },
      },
    })

  const { test } = agent
    .query({
      test: agent.resource('did:key:zSpace').store.list({
        cursor: 'hello',
      }),
    })
    .decode()

  if (!test.error) {
    test.results
  }

  const worker = agent.connect({
    principal: Principal.parse('did:web:web3.storage'),
    capabilities: upload.and(debug),
  })

  const space = worker.capabilities.from('did:key:zSpace')

  const listUploads = await space.upload
    .list({
      cursor: 'last',
    })
    .select({
      results: true,
    })

  const out = listUploads.decode(new Uint8Array())
  if (!out.error) {
    out.results[0].root
  }

  const { first, second } = worker
    .query({
      first: space.upload
        .list({
          cursor: 'last',
        })
        .select({
          results: true,
          cursor: true,
        }),
      second: space.debug.info(),
    })
    .decode()

  if (!first.error) {
    first.results[0].root
    first.cursor
  }

  if (!second.error) {
    second.did
  }
}

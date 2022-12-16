import * as API from '../src/api.js'
import { capability, Schema, DID, URI, Text, Link } from '@ucanto/validator'
import { ed25519 } from '@ucanto/principal'
import { test } from './test.js'
import { CAR } from '@ucanto/transport'

test('demo', () =>
  /**
   * @param {object} $
   * @param {API.AgentModule} $.Agent
   * @param {API.Verifier} $.w3
   * @param {API.Signer} $.me
   */
  async ({ Agent, me }) => {
    // Can delegate everything!!
    const All = capability({
      with: DID.match({}),
      can: '*',
    })

    const Store = capability({
      with: DID.match({}),
      can: 'store/*',
    })

    const Upload = capability({
      with: DID.match({}),
      can: 'upload/*',
    })

    const root = await ed25519.generate()
    const w3 = root.withDID('did:web:web3.storage')

    const manager = await ed25519.generate()

    const uploadWorker = await ed25519.generate()
    const storeWorker = await ed25519.generate()

    const authorization = await Upload.delegate({
      issuer: manager,
      audience: uploadWorker,
      with: w3.did(),
      expiration: Infinity,
      proofs: [
        await All.delegate({
          issuer: w3,
          audience: manager,
          with: w3.did(),
        }),
      ],
    })

    const UploadAdd = capability({
      with: DID.match({ method: 'key' }),
      can: 'upload/add',
      nb: {
        root: Link.match({ version: 1 }),
        shards: Link.match({ version: 1 }).array().optional(),
      },
    })

    const UploadList = capability({
      with: DID.match({ method: 'key' }),
      can: 'upload/list',
      nb: {
        cursor: Schema.string().optional(),
        /**
         * Maximum number of items per page.
         */
        size: Schema.integer().optional(),
      },
    })

    const uploadAgent = Agent.create({
      signer: uploadWorker,
      delegations: [authorization],
    })

    export const service = uploadAgent.connect({
      principal: w3,
      capabilities: [Echo, Version],
    })




    
      // .init(async () => ({
      //   password: 'hello',
      //   debug: false,
      // }))
      // .provide(UploadAdd, ({ capability, invocation, context, agent }) => {
        

      //   agent.delegate({
      //     can: 'voucher/redeem',
      //     with: agent.did()
      //   })
        
      //   return null
      // })
      // .provide(UploadList, ({ capability, context, agent }) => {
      //   return { entries: [Link.parse('bafkqaaa')] }
      // })




    const Echo = capability({
      with: DID.match({}),
      can: 'test/echo',
      nb: {
        text: Text,
      },
    })

    const Version = capability({
      with: DID.match({}),
      can: 'test/version',
    })

    

    service.invoke({
      can: 'upload/add',
      with: 
    })




    uploadAgent.invoke()

    const msg = await Echo.invoke({
      issuer: me,
      audience: agent.signer,
      with: me.did(),
      nb: {
        text: 'hello',
      },
    }).delegate()

    const ver = await Version.delegate({
      issuer: me,
      audience: agent.signer,
      with: me.did(),
    })

    const echo = await agent.invoke(msg)

    if (!echo.error) {
      echo
    }

    const v = await agent.invoke({
      can: 'system/info',
      with: alice.did(),
    })

    const Send = Agent.with(DID.match({ method: 'key' })).can('inbox/add', {
      message: Schema.Text.text(),
    })

    const a = Agent.match(DID.match({ method: 'key ' }), {
      // '*': {},
      // foo: { x: 1, f() {} },
      foo: Schema.never(),
      'system/info': Schema.struct({}),

      'test/echo': Schema.struct({
        msg: Schema.string(),
      }),
    })

    a.capabilities

    Send.invoke
  })

const fail = Schema.struct({ error: true })


/**
 * @template T
 * @template {{}} [X={message:string}]
 * @param {Schema.Reader<T>} ok
 * @param {Schema.Reader<X>} error 
 * @returns {Schema.Schema<API.Result<T & {error?: undefined}, X & { error: true }>>}
 */
const result = (ok, error = Schema.struct({ message: Schema.string() })) => Schema.or(/** @type {Schema.Reader<T & {error?:never}>} */(ok), fail.and(error))

// /**
//  * @template In
//  * @template Out
//  * @template {{error:true}} [Fail={error:true, message:string}]
//  * @param {Schema.Reader<In>} input 
//  * @param {Schema.Reader<API.Result<Out, Fail>>} output
//  * @returns {API.Ability<In, Out, Fail>}
//  */
// const ability = (input, output) => ({ in: input, out: output })

test('demo', () =>
  /**
   * @param {object} $
   * @param {API.AgentModule} $.Agent
   * @param {API.Verifier} $.w3
   * @param {API.Signer} $.me
   */
  async ({ Agent, me, w3 }) => {

    const source = Agent.resource(DID, {
      test: {
        version: result(Schema.integer()),
        echo: {
          in: Schema.string(),
          out: result(Schema.struct({
            text: Schema.string(),
            version: Schema.integer()
          })
        }
      },
    })


    const CARLink = Link.match({ code: CAR.codec.code, version: 1 })

    const Root = Schema.struct({
      root: Link
    })

    const Shards = Schema.struct({
      shards: CARLink.array().optional()
    })

    const Upload = Root.and(Shards)

    const Cursor = Schema.struct({
      cursor: Schema.string().optional(),
      size: Schema.integer().optional()
    })

    /**
     * @template T
     * @param {API.Reader<T>} result 
     */
    const list = (result) => Cursor.and(Schema.struct({
      results: Schema.array(result)
    }))

    const UploadProtocol = Agent.resource(URI.match({ protocol: 'did:' }), {
      upload: {
        add: Agent.ability(Upload, result(Upload)),
        remove: Agent.ability(Root, result(Schema.struct({}))),
        list: Agent.ability(Cursor, result(list(Upload)))
      }
    })

    const Base = Agent.resource(URI.match({ protocol: 'did:' }), {
      '*': Schema.struct({}),
      upload: {
        add: Schema.struct({
          root: Schema.Link
        }),
        info: Schema.struct({})
      }
    })

    const a1 = Base.upload.add.delegate('did:key:zAlice', {})
    const a2 = Base.upload.add.invoke('did:key:zAlice', { root: Link.parse('bafkqaaa')})









    const UploadAdd = Agent.resource(DID, {
      upload: {
        add: Agent.ability(Upload, result(Upload))
      }
    })



    const ConsoleProtocol = Agent.resource(DID.match({ method: 'key' }), {
      console: {
        log: Agent.ability(Upload, result(Schema.string()))
      }
    })


    const service = UploadProtocol.and(ConsoleProtocol)
      .with({ password: 'secret' })
      .provide({
        upload: {
          add: async (uri, upload, context) => {
            return upload
          },
          remove: (uri, {root}, context) => {
            return { root }
          },
          list: (uri, cursor, context) => {
            return { ...cursor, results: [] }
          }
        },
        console: {
          log: (uri, upload, context) => {
            return uri
          }
        }
      })


    

    const alice = UploadProtocol.and(ConsoleProtocol).from('did:key:zAlice')



    const add = alice.upload.add({
       root: Link.parse('bafkqaaa')
      })
    
    const q = UploadProtocol.query({
      a: add,
      b: add,
      info: alice.console.log(add)
    })

    const tp = UploadProtocol.query([add, add])



    const r = q.decode()
    
    if (!r.info.error) {
      r.info.toLocaleLowerCase()
    }

    if (!r.a.error) {
      r.a.root
    }
    if (!r.b.error) {
      r.b
    }

    // const add = UploadCapabilities.from('did:key:zAlice').upload.add({
    //   root: Link.parse('bafkqaaa')
    // })

    // const ver = source.from(me.did()).test.version()

    // const a = source.from('did:key:zAlice')
    // const selector = a.test.echo("hello").select({ text: true })

    // const s = { ...selector}

    // const echo = selector.invoke({
    //   issuer: me,
    //   audience: w3
    // })

    // const out = await selector.decode(new Uint8Array())
    // if (!out.error) {
    //   const data = { ...out }
    // }

    // const resource = Agent.resource(DID).field(
    //   'test/version',
    //   Schema.unknown().optional(), 
    //   version
    // ).field('test/echo', Schema.string().optional(),
    //   result(Schema.string()))
    
    // const v = resource.from(me.did()).abilities['test/version'].invoke(null)
    // if (!v.error) {
    //   v
    // }

    // const e = resource.from(me.did()).abilities['test/echo'].invoke('hello')
    // if (!e.error) {
    //   e.toLocaleLowerCase()
    // }
  })


/**
 * @param {object} input
 * @param {API.AgentModule} input.Agent
 */
const w3protocol = async ({ Agent }) => {
  const Space = DID.match({ method: 'key' })

  const Add = Schema.struct({
    link: Schema.Link,
    size: Schema.integer(),
    origin: Schema.Link.optional()
  })

  const AddDone = Schema.struct({
    status: 'done',
    with: Space,
    link: Schema.Link
  })

  const AddHandOff = Schema.struct({
    status: 'upload',
    with: Space,
    link: Schema.Link,
    url: Schema.URI,
    headers: Schema.
  })

  return Agent.resource(Space, {
    store: {
      _: Schema.struct({}),
      add: Agent.ability(Add, )
    }
  })
}

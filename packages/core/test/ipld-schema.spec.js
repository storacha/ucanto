import * as Schema from '../src/schema.js'
import { CBOR } from '../src/dag.js'
import { test, assert } from './test.js'

describe.only('IPLD Schema', () => {
  test('cross block references', async () => {
    const Content = Schema.bytes()
    const DealDetail = Schema.struct({
      size: Schema.integer(),
      commit: Schema.string(),
      content: Content.link(),
    })

    const dealLink = DealDetail.link()
    dealDetail.from({})

    Schema.debug(DealDetail).in.content

    const detail = DealDetail.from({
      size: 1,
      commit: 'a',
      content: Content.link().parse('baakfa'),
    })

    const cbor = Schema.bytes(CBOR)
    const dealDetail = cbor.refine(DealDetail)
    const dl = dealDetail.decode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    dl.content

    Schema.debug(cbor)

    const thing = Schema.dictionary({ value: Schema.unknown() })

    const out = Schema.dag({
      codec: CBOR,
    })

    out.refine(DealDetail)

    const DL = cbor.refine(DealDetail)

    const DL2 = Schema.dictionary({
      value: Schema.unknown(),
    }).refine(DealDetail)

    const hello = Schema.string()
      .startsWith('hello')
      .endsWith('world')
      .startsWith('hello ')

    const dl2 = DL.from(new Uint8Array())
    dl2.size

    // const a = {}

    // const out = await Deal.compile({
    //   size: 2,
    //   commit: 'a',
    // })

    // const Offer = Deal.array()
    // Deal.link().attach().OUT

    // const Aggregate = Schema.struct({
    //   offer: Offer.link().resolve(),
    //   attachment: Offer.link().attach(),
    // })

    // Offer.link().IN
    // Offer.link().attach().IN

    // const offer = Offer.from([
    //   { size: 1, commit: 'a' },
    //   { size: 2, commit: 'b' },
    // ])

    // Aggregate.IN.attachment

    // const attachment = await Offer.attachment(offer)
    // const aggregate = await Aggregate.compile({
    //   offer, //: await Offer.attach(offer)
    //   attachment,
    // })

    // const agg = aggregate.root.data

    // agg.attachment.resolve()[0].commit

    // aggregate.root.data.offer.resolve()[0].commit
    // // const out = aggregate.offer.load()
  })
})

import * as Schema from '../src/schema.js'
import { CBOR } from '../src/dag.js'
import { test, assert } from './test.js'

describe.only('IPLD Schema', () => {
  test('cross block references', async () => {
    const Deal = Schema.struct({
      size: Schema.integer(),
      commit: Schema.string(),
    })
    Deal.IN

    const DL = Schema.bytes().encoding(CBOR).refine(Deal)
    DL.IN
    DL.OUT

    const int = Schema.bytes().encoding(CBOR).refine(Schema.integer())
    int.IN
    int.OUT

    int.from(new Uint8Array())

    const a = {}

    const out = await Deal.compile({
      size: 2,
      commit: 'a',
    })

    const Offer = Deal.array()
    Deal.link().attach().OUT

    const Aggregate = Schema.struct({
      offer: Offer.link().resolve(),
      attachment: Offer.link().attach(),
    })

    Offer.link().IN
    Offer.link().attach().IN

    const offer = Offer.from([
      { size: 1, commit: 'a' },
      { size: 2, commit: 'b' },
    ])

    Aggregate.IN.attachment

    const attachment = await Offer.attachment(offer)
    const aggregate = await Aggregate.compile({
      offer, //: await Offer.attach(offer)
      attachment,
    })

    const agg = aggregate.root.data

    agg.attachment.resolve()[0].commit

    aggregate.root.data.offer.resolve()[0].commit
    // const out = aggregate.offer.load()
  })
})

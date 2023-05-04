import * as Schema from '../src/schema.js'
import { CBOR } from '../src/dag.js'
import { test, assert } from './test.js'

describe.only('IPLD Schema', () => {
  test('cross block references', async () => {
    const Deal = Schema.struct({
      size: Schema.integer(),
      commit: Schema.string(),
    })

    const cbor = Schema.bytes(CBOR)

    Schema.debug(cbor)

    const thing = Schema.dictionary({ value: Schema.unknown() })

    const DL = Schema.bytes(CBOR)

    const DL2 = DL.pipe(Deal)

    const dl2 = DL2.from(new Uint8Array())
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

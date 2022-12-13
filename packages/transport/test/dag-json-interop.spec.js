import { test, assert } from './test.js'
import * as CBOR from '../src/cbor.js'
import * as CAR from '../src/car.js'
import * as UTF8 from '../src/utf8.js'
import { alice, service } from './fixtures.js'
import * as json from '@ipld/dag-json'

test('DAG-JSON recognizes links', async () => {
  const data = new Uint8Array([11, 22, 34, 44, 55])
  const link = await CAR.codec.link(data)
  const nb = { link, size: data.byteLength }
  const can = 'store/add'

  const request = await CAR.encode([
    {
      issuer: alice,
      audience: service,
      capabilities: [
        {
          can,
          with: alice.did(),
          nb,
        },
      ],
      proofs: [],
    },
  ])

  const car = await CAR.codec.decode(request.body)
  const dagCbor = await CBOR.codec.decode(car.roots[0].bytes)
  const encodedDagJson = json.encode(dagCbor)

  const dagJson = JSON.parse(UTF8.decode(encodedDagJson))
  assert.deepEqual(dagJson.att, [
    {
      can: 'store/add',
      with: alice.did(),
      nb: {
        link: { '/': link.toString() },
        size: 5,
      },
    },
  ])
})

import { test, assert } from "./test.js"
import * as CBOR from "../src/cbor.js"
import { decode, encode } from "@ipld/dag-cbor"
test("encode / decode", async () => {
  // @ts-ignore
  const response = CBOR.encode([{ ok: true, value: 1 }])

  assert.deepEqual(response, {
    headers: {
      "content-type": "application/cbor",
    },
    body: encode([{ ok: true, value: 1 }]),
  })

  assert.deepEqual(await CBOR.decode(response), [{ ok: true, value: 1 }])
})

test("throws on wrong content-type", async () => {
  try {
    await CBOR.decode({
      headers: { "content-type": "application/octet-stream" },
      body: encode([{ ok: true, value: 1 }]),
    })
    assert.fail("should have failed")
  } catch (error) {
    assert.match(String(error), /application\/cbor/)
  }
})

test("content-type case", async () => {
  assert.deepEqual(
    await CBOR.decode({
      headers: { "Content-Type": "application/cbor" },
      body: encode([{ ok: true, value: 1 }]),
    }),
    [{ ok: true, value: 1 }]
  )
})

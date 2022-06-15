import { test, assert } from "./test.js"
import { CID } from "multiformats"
import * as Link from "../src/link.js"

{
  const dataset = [
    [
      "QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB",
      "bafybeihgb7yguzxak7m4yu6pmxn3fdarzqbkshw6ovq7bxzbpilu4wl63a",
      "QmdpiaQ9q7n4E224syBJz4peZpAFLArwJgSXHZWH5F6DxB",
    ],
    [
      "bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny",
      "bafybeiepa5hmd3vg2i2unyzrhnxnthwi2aksunykhmcaykbl2jx2u77cny",
      "QmXxyUQDxCpSuF8QrWHxsqmeCzMnHCukaBU3hnkgnYLYHj",
    ],
  ]

  for (const [input, expect, expect2] of dataset) {
    test(`Link.create - ${input}`, () => {
      const cid = CID.parse(input)
      const link = Link.create(cid.code, cid.multihash)
      assert.deepEqual(link, CID.parse(expect))
    })

    test(`Link.createV0 - ${input}`, () => {
      const cid = CID.parse(input)
      const link = Link.createV0(cid.multihash)
      assert.deepEqual(link.toString(), CID.parse(expect2).toString())
    })
  }
}

import { assert, test } from "./test.js"
import * as Signer from "../src/index.js"
import { parseLink } from "@ucanto/core"

test("should signer", () => {
  const link = parseLink(
    "bafybeiczcw2d5ej66e6kh4ae4a7extcuiukdngukf65pf5fphndd4likvy"
  )

  const url = Signer.sign(link, {
    accessKeyId: "id",
    secretAccessKey: "secret",
    bucket: "my-bucket",
    region: "eu-central-1",
  })

  const params = url.searchParams

  assert.equal(url instanceof URL, true)
  assert.equal(url.host, "my-bucket.s3.eu-central-1.amazonaws.com")
  assert.equal(params.get("X-Amz-SignedHeaders"), "host;x-amz-checksum-sha256")
  assert.equal(params.get("X-Amz-Expires"), "1000")
  assert.equal(params.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256")
  assert.match(params.get("X-Amz-Credential") || "", /aws4_request/)
  assert.equal((params.get("X-Amz-Signature") || "").length > 2, true)
})

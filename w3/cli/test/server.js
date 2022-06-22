import * as Client from "@ucanto/client"
import * as Server from "@ucanto/server"
import * as CAR from "@ucanto/transport/car"
import * as CBOR from "@ucanto/transport/cbor"
import { SigningAuthority } from "@ucanto/authority"
import * as Store from "w3-store"
import { Identity, Accounting, server } from "w3-store"
import * as Signer from "w3-signer"
import * as HTTP from "node:http"
import { script } from "subprogram"

/**
 *
 * @param {{
 * w3id: Server.API.SigningAuthority
 * w3store: Server.API.SigningAuthority
 * }} config
 * @returns
 */
export const service = ({ w3id, w3store }) => {
  const s3 = new Map()
  const metadata = new Map()
  const accounts = new Map()

  const identity = Identity.service({ id: w3id, db: accounts })

  const store = Store.service({
    self: w3store,
    accounting: Accounting.service({
      db: metadata,
      cars: s3,
    }),
    signer: Signer,
    signerConfig: {
      accessKeyId: "id",
      secretAccessKey: "secret",
      region: "us-east-2",
      bucket: "my-test-bucket",
    },
    identity: {
      id: w3id,
      client: Client.connect({
        encoder: CAR,
        decoder: CBOR,
        channel: Server.create({
          id: w3id,
          decoder: CAR,
          encoder: CBOR,
          service: { identity },
        }),
      }),
    },
  })

  return { store, identity }
}

/**
 * @typedef {{
 *   w3storeKepair: string
 *   w3idKepair: string
 *   port: number
 * }} Config
 * @param {Partial<Config>} config
 */
export const main = async ({
  w3storeKepair = process.env.SERVICE_KEYPAIR || "",
  w3idKepair = process.env.W3_ID_KEYPAIR || "",
  port = parseInt(process.env.PORT || "8080"),
} = {}) => {
  const w3store = SigningAuthority.parse(w3storeKepair)
  // const w3id = SigningAuthority.parse(w3idKepair)

  const server = Server.create({
    id: w3store.authority,
    encoder: CBOR,
    decoder: CAR,
    // we actually want to use differnt w3id but right now there is no good
    // way to expose services bound different keys.
    service: service({ w3id: w3store, w3store }),
  })

  HTTP.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }

    const { headers, body } = await server.request({
      // @ts-ignore - node type is badly typed
      headers: request.headers,
      body: Buffer.concat(chunks),
    })

    response.writeHead(200, headers)
    response.write(body)
    response.end()
  }).listen(port)

  console.log(`Service ${w3store.did()} is listening on port ${port}`)
}

script({ ...import.meta, main, dotenv: true })

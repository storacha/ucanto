import { test, assert } from './test.js'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { SigningAuthority } from '@ucanto/authority'
import { Store, Identity, Accounting } from '../src/lib.js'
import { alice, bob, service as validator } from './fixtures.js'
import HTTP from 'node:http'

test('main', async () => {
  const s3 = new Map()

  const w3 = await SigningAuthority.generate()

  const provider = Store.create({
    keypair: SigningAuthority.format(await SigningAuthority.generate()),
    identity: Identity.create({
      keypair: SigningAuthority.format(w3),
    }),
    accounting: Accounting.create({ cars: s3 }),
    signingOptions: {
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      region: 'us-east-2',
      bucket: 'my-test-bucket',
    },
  })

  const server = HTTP.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }

    const { headers, body } = await provider.handleRequest({
      // @ts-ignore - node type is Record<string, string|string[]|undefined>
      headers: request.headers,
      body: Buffer.concat(chunks),
    })

    response.writeHead(200, headers)
    response.write(body)
    response.end()
  })
  await new Promise((resolve) => server.listen(resolve))
  // @ts-ignore - this is actually what it returns on http
  const { port } = server.address()

  // This is something that client like CLI will do
  const store = Store.connect({
    id: provider.id.did(),
    url: new URL(`http://localhost:${port}`),
  })

  const car = await CAR.codec.write({
    roots: [await CBOR.codec.write({ hello: 'world' })],
  })

  // errors if not registered
  {
    const result = await Store.Add.invoke({
      issuer: alice,
      audience: store.id,
      with: alice.did(),
      caveats: { link: car.cid },
    }).execute(store)

    assert.containSubset(result, {
      error: true,
      name: 'NotRegistered',
      message: `No account is registered for ${alice.did()}`,
    })
  }

  // can not register without a proof
  {
    // service delegates to the validator
    const validatorToken = await Client.delegate({
      issuer: w3,
      audience: validator,
      capabilities: [
        {
          can: 'identity/register',
          with: 'mailto:*',
          as: 'did:*',
        },
      ],
    })

    // validator after validation delegates to alice
    const registrationToken = await Client.delegate({
      issuer: validator,
      audience: alice,
      capabilities: [
        {
          can: 'identity/register',
          with: 'mailto:alice@web.mail',
          as: alice.did(),
        },
      ],
      proofs: [validatorToken],
    })

    const result = await Identity.Register.invoke({
      issuer: alice,
      audience: store.id,
      with: 'mailto:alice@web.mail',
      caveats: {
        as: alice.did(),
      },
      proofs: [registrationToken],
    }).execute(store)

    console.log(result)

    assert.deepEqual(result, null)
  }

  // alice should be able to check her identity
  {
    const result = await Identity.Identify.invoke({
      issuer: alice,
      audience: store.id,
      with: alice.did(),
    }).execute(store)

    assert.match(String(result), /did:ipld:bafy/)
  }

  // now that alice is registered she can add a car file
  {
    const result = await Store.Add.invoke({
      issuer: alice,
      audience: store.id,
      with: alice.did(),
      caveats: { link: car.cid },
    }).execute(store)

    assert.containSubset(result, {
      status: 'upload',
      with: alice.did(),
      link: car.cid,
    })

    assert.match(Object(result).url, /https:.*s3.*amazon/)
  }

  // if alice adds a car that is already in s3 no upload will be needed
  {
    const car = await CAR.codec.write({
      roots: [await CBOR.codec.write({ another: 'car' })],
    })

    // add car to S3
    s3.set(`${car.cid}/data`, true)

    const result = await Store.Add.invoke({
      issuer: alice,
      audience: store.id,
      with: alice.did(),
      caveats: { link: car.cid },
    }).execute(store)

    assert.containSubset(result, {
      status: 'done',
      with: alice.did(),
      link: car.cid,
      url: undefined,
    })
  }

  // bob can not store/add into alice's group
  {
    const result = await Store.Add.invoke({
      issuer: bob,
      audience: store.id,
      with: alice.did(),
      caveats: {
        link: car.cid,
      },
    }).execute(store)

    assert.containSubset(result, {
      error: true,
      name: 'Unauthorized',
    })
  }

  // but if alice delegates capability to bob we can add to alice's group
  {
    const result = await Store.Add.invoke({
      issuer: bob,
      audience: store.id,
      with: alice.did(),
      caveats: { link: car.cid },
      proofs: [
        await Client.delegate({
          issuer: alice,
          audience: bob,
          capabilities: [
            {
              can: 'store/add',
              with: alice.did(),
            },
          ],
        }),
      ],
    }).execute(store)

    assert.containSubset(result, {
      with: alice.did(),
      link: car.cid,
    })
  }

  server.close()
})

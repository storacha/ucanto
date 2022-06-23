import * as Soly from 'soly'
import { script } from 'subprogram'
import Conf from 'conf'
import ora from 'ora'
import Z from 'zod'
import * as Client from '@ucanto/client'
import { SigningAuthority, Authority } from '@ucanto/authority'
import { Delegation, UCAN } from '@ucanto/core'
import * as CBOR from '@ucanto/transport/cbor'
import Inquirer from 'inquirer'
import { Store, Identity } from 'w3-store'
import { Failure } from '@ucanto/server'
import * as Service from 'w3-store'

const cli = Soly.createCLI('w3-cli')
cli
  .command('register', (input) => {
    const [data] = input.positionals(Soly.string().optional(), 0)

    return () => register(data.value)
  })
  .command('import', (input) => {
    const [path] = input.positionals([Soly.path()])
    return async () => {
      const id = identity(configure())
      const proof = console.log(path.value)
    }
  })
  .command('id', (input) => {
    return async () => {
      const id = await identity()
      console.log(id.did())
    }
  })
  .command('whoami', () => {
    return () => whoami()
  })

/**
 * @param {string} [input]
 * @return {Promise<undefined>}
 */
export const register = async (input, { client, settings } = configure()) => {
  const view = ora('register')
  const email = input == undefined ? null : tryParseEmail(input)

  // if email was provided we start registration
  if (email) {
    view.start(`🎫 Registering account for ${email}`)
    settings.set('email', email)

    const issuer = await identity()
    const result = await Identity.Validate.invoke({
      issuer,
      audience: client.id,
      with: issuer.did(),
      caveats: {
        as: `mailto:${email}`,
      },
    }).execute(client)

    if (result?.error) {
      return void view.fail(result.message)
    }

    view.stopAndPersist()
    return register(undefined, { client, settings })
  }
  // If cid is provided complete we complete a registration
  else if (settings.has('email')) {
    if (input && input.split('.').length >= 3) {
      const issuer = await identity({ client, settings })

      const proof = await importToken(input)

      if (proof.error) {
        return void view.fail(proof.message)
      }

      if (proof.audience.did() !== issuer.did()) {
        return void view.fail(
          `Wrong token: addressed to ${proof.audience.did()} instead of ${issuer.did()}`
        )
      }

      console.log(`${issuer.did()} -> ${client.id.did()}`)

      const result = await Identity.Register.invoke({
        issuer,
        audience: client.id,
        with: proof.capabilities[0].with,
        caveats: {
          as: proof.capabilities[0].as,
        },
        proofs: [proof],
      }).execute(client)

      if (result?.error) {
        return void view.fail(`🎫 Registration failed: ${result.message}`)
      } else {
        settings.delete('email')
        view.succeed('🎫 Registration complete')
      }

      return undefined
    } else {
      const email = settings.get('email')
      view.start(`🎫 Check ${email} inbox & paste registration token below\n`)
      view.stopAndPersist()

      const { token } = await Inquirer.prompt({
        name: 'token',
        validate: (answer) => {
          if (answer.split('.').length >= 3) {
            return true
          } else {
            throw new Error(`Not a valid JWT token`)
          }
        },
      })
      return await register(token, { client, settings })
    }
  }
  // otherwise we prompt for the email address to initiate registration
  else {
    view.start(`🎫 Please provide email address to register account with`)
    view.stopAndPersist()
    const { email } = await Inquirer.prompt({
      name: 'email',
      validate: (input) => tryParseEmail(input) != null,
    })

    return await register(email, { client, settings })
  }
}

/**
 * @param {string} input
 * @return {Promise<Client.Result<Client.Delegation<[Service.Type.Identity.Register]>, Client.Failure>>}
 */

const importToken = async (input) => {
  try {
    const ucan = UCAN.parse(/** @type {UCAN.JWT} */ (input))

    const root = /** @type {Client.Block<[Service.Type.Identity.Register]>} */ (
      await UCAN.write(ucan)
    )
    return Delegation.create({ root })
  } catch (error) {
    return new Failure(String(error))
  }
}

/**
 * @param {string} input
 */
const tryParseEmail = (input) => {
  try {
    return Z.string().email().parse(input)
  } catch (error) {
    return null
  }
}

export const main = async () => {
  // await cli.parse([...process.argv, "register", "--email", "alice@web.mail"])
  await cli.parse(process.argv)
}

/**
 * @return {Promise<Client.SigningAuthority>}
 */

export const identity = async ({ settings } = configure()) => {
  const view = ora('identity').start('🔑 Loading secret key')
  const secret = settings.get('secret') || new Uint8Array()

  try {
    const id = SigningAuthority.decode(secret)
    view.succeed()
    return id
  } catch (error) {
    // throw error
    view.text = '🔑 Generating new secret key'
    const authority = await SigningAuthority.generate()
    view.text = '🔑 Saving secret key'

    settings.set('secret', SigningAuthority.encode(authority))
    view.succeed()
    return authority
  }
}

export const whoami = async ({ client } = configure()) => {
  const view = ora('whoami').start('🪪 Resolving account')
  const issuer = await identity()
  const result = await Service.Identity.Identify.invoke({
    issuer,
    audience: client.id,
    with: issuer.did(),
  }).execute(client)

  if (result.error) {
    view.fail(`🪪 Failed to resolve: ${result.message}`)
  } else {
    view.succeed(`🪪 ${result}`)
  }
}

/**
 * @typedef {{
 *   secret?: Uint8Array
 *   email?: string
 *   token?: Uint8Array
 *   serviceDID: Client.DID
 *   serviceURL?: URL
 * }} Configuration
 */
const configure = ({ projectName = 'w3-cli' } = {}) => {
  const settings = /** @type {Conf<Configuration>} */ (
    new Conf({
      projectName,
      fileExtension: 'cbor',
      serialize: ({ ...data }) =>
        Buffer.from(CBOR.codec.encode(data)).toString('binary'),
      deserialize: (text) => CBOR.codec.decode(Buffer.from(text, 'binary')),
    })
  )

  const client = connect()

  return { settings, client }
}

/**
 * @param {{id?: Client.DID, url?:URL}} [config]
 */
const connect = ({
  id = /** @type {Client.DID} */ (
    process.env.W3_STORE_DID ||
      'did:key:z6MkqJLaQH7VNbn4d8cNZiiABK2uzMCThzMWtgU7vyrFJRe1'
  ),
  url = new URL(process.env.SERVICE_URL || 'http://localhost:8080'),
} = {}) =>
  Store.connect({
    id,
    url,
  })

script({ ...import.meta, main, dotenv: true })

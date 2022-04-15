import { script } from 'subprogram'
import Conf from 'conf'
import { KeyPair } from 'ucan-storage/keypair'
import ora from 'ora'
import * as UCAN from 'ucan-storage/ucan'
import { sha256 } from 'multiformats/hashes/sha2'
import { CID } from 'multiformats/cid'

const NAME = 'web3-upload'

const defaults = {
  secret: '',
  ucan: '',
}

/**
 * @typedef {{
 *   secret: string
 *   ucan: string
 * }} Config
 *
 * @typedef {Conf<Config>} Settings
 * @typedef {ReturnType<ora>} Output
 *
 * @typedef {{
 *   projectName: string
 *   config: Config
 *   settings: Settings
 *   view: Output
 * }} Context
 *
 * @typedef {Partial<Context>} Options
 * @param {Context} context
 */

/**
 * @param {Options} options
 */
const use = ({
  projectName = NAME,
  config = defaults,
  settings = new Conf({ projectName, defaults: config }),
  view = ora('').start(),
} = {}) => ({ projectName, config, settings, view })

/**
 * @param {Options} options
 */
const main = async (options) => {
  const context = use(options)
  const id = await identify(context)

  context.view.info(`🆔 ${id.payload.aud}`)

  const digest = await sha256.digest(new TextEncoder().encode(id.jwt))

  const { view } = context

  view.start('🔬 Look for good cid code')
  let code = 0x787f
  let old = new Set()

  while (true) {
    const cid = CID.createV1(code, digest).toString()
    const prefix = cid.slice(0, 5)
    if (!old.has(prefix)) {
      console.log(
        `${prefix}           | 0x${code.toString(16)}          | ${cid}`
      )

      old.add(prefix)
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0))
      view.text = `${prefix}           | 0x${code.toString(
        16
      )}          | ${cid}`
    }

    if (
      cid.slice(0, 2) != 'ba' ||
      cid.slice(2).startsWith('can') ||
      cid.slice(2).startsWith('uc')
    ) {
      view.info(`${cid} 0x${code.toString(16)}`)
      break
    }
    code += 1
  }
}

/**
 * @param {Options} options
 */
const identify = async (options) => {
  const { view, settings } = use(options)
  view.start('🎫 Load id')
  const id = await secret({ view, settings })
  const jwt = settings.get('ucan')
  const ucan = await UCAN.validate(jwt).catch(() => null)

  if (!ucan || ucan.payload.aud !== id.did()) {
    view.text = '🎫 Generating new id'
    const ucan = await UCAN.build({
      issuer: id,
      audience: id.did(),
      lifetimeInSeconds: 1000 * 60 * 60 * 24 * 30,
      capabilities: [
        {
          with: id.did(),
          can: /** @type {any} */ ('*'),
        },
      ],
    })
    view.text = '🎫 Saving new id'
    settings.set('ucan', ucan.jwt)

    view.succeed('🎫 Loaded new id')
    return ucan
  }

  view.succeed('🎫 Loaded id')
  return { jwt, ...ucan }
}

/**
 * @param {Partial<Options>} options
 */

const secret = async (options) => {
  const { view, settings } = use(options)
  view.start('🔑 Loading secret key')
  const key = settings.get('secret').trim()
  const keypair =
    key === '' ? null : await KeyPair.fromExportedKey(key).catch(() => null)

  if (!keypair) {
    view.text = '🔑 Generating secret key'
    const keypair = await KeyPair.create()
    view.text = '🔑 Saving secret key'
    settings.set('secret', keypair.export())

    view.succeed('🔑 Loaded secret')
    return keypair
  }

  view.succeed('🔑 Loaded secret')
  return keypair
}

script({ ...import.meta, main })

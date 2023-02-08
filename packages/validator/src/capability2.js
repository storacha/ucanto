import * as API from '@ucanto/interface'
import { entries, combine, intersection } from './util.js'
import * as Schema from './schema.js'
import {
  EscalatedCapability,
  MalformedCapability,
  UnknownCapability,
  DelegationError as MatchError,
  Failure,
} from './error.js'
import { invoke, delegate } from '@ucanto/core'
import * as validator from './lib.js'

/**
 * @template {API.Ability} Can
 * @template {API.URI} URI
 * @template {{[key:string]: API.Reader}} In
 * @param {{
 * can: Can
 * with: API.Reader<URI>
 * nb: Schema.StructSchema<In>
 * }} schema
 */

const capability = schema => new Capability(schema)

/**
 * @template {API.Ability} Can
 * @template {API.URI} URI
 * @template {{[key:string]: API.Reader}} In
 */

class Capability {
  /**
   * @param {{
   * can: Can
   * with: API.Reader<URI>
   * nb: Schema.StructSchema<In>
   * }} schema
   */
  constructor(schema) {
    this.schema = Schema.struct(schema)
  }

  /**
   * @param {API.Proof[]} proofs
   * @param {API.ClaimOptions} options
   */
  async claim(
    proofs,
    {
      authority,
      principal,
      resolveDIDKey = validator.failDIDKeyResolution,
      canIssue = validator.isSelfIssued,
      resolve = validator.unavailable,
    }
  ) {
    const config = {
      canIssue,
      resolve,
      principal,
      capability,
      authority,
      resolveDIDKey,
    }

    const invalidProofs = []
    /** @type {API.Source[]} */
    const sources = []

    for (const proof of await validator.resolveProofs(proofs, config)) {
      const delegation = proof.error
        ? proof
        : await validator.validate(proof, config)

      if (!delegation.error) {
        for (const [index, capability] of delegation.capabilities.entries()) {
          sources.push({
            capability,
            delegation,
            index,
          })
        }
      } else {
        invalidProofs.push(delegation)
      }
    }

    for (const source of sources) {
      const result = this.schema.read(source.capability)
    }
  }

  /**
   * @param {API.Capability} source
   */
  match(source) {
    const result = this.schema.read(source)
  }
}

const ping = capability({
  can: 'dev/ping',
  with: Schema.URI,
  nb: Schema.struct({
    message: Schema.string(),
  }),
})

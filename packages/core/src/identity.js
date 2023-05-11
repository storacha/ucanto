import * as API from '@ucanto/interface'

import { identity } from 'multiformats/hashes/identity'

/** @type {API.MulticodecCode<typeof identity.code, typeof identity.name>} */
export const code = identity.code
export const name = identity.name
export const { encode } = identity
export const digest = identity.digest.bind(identity)

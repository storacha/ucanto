import * as API from '@ucanto/interface'

import { sha256 } from 'multiformats/hashes/sha2'

/** @type {API.MulticodecCode<typeof sha256.code, typeof sha256.name>} */
export const code = sha256.code
export const name = sha256.name
export const { encode } = sha256
export const digest = sha256.digest.bind(sha256)

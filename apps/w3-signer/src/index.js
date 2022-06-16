import { base64pad } from "multiformats/bases/base64"
import { SigV4 } from "@web3-storage/sigv4"

/**
 *
 * @param {import('./types').Link} link
 * @param {import('./types').SignOptions} options
 */
export const sign = (link, { bucket, expires = 1000, ...options }) => {
  // sigv4
  const sig = new SigV4({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region,
  })

  const checksum = base64pad.baseEncode(link.multihash.digest)
  return sig.sign({
    key: link.toString(),
    checksum: checksum,
    bucket,
    expires,
  })
}

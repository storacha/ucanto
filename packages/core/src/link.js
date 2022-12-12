export * from 'multiformats/link'

/**
 * @template {import('multiformats').UnknownLink} Link
 * @param {Link} link
 */
export const toJSON = link =>
  /** @type {import('@ucanto/interface').LinkJSON<Link>} */ ({
    '/': link.toString(),
  })

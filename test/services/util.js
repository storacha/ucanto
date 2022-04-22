/**
 * @template T
 * @param {T} value
 */
export const ok = value => ({ ok: the(true), value })

/**
 * @template X
 * @param {X} error
 */
export const error = error => ({ ok: the(false), error })

/**
 * @template {string|boolean|number} T
 * @param {T} value
 * @returns {T}
 */
export const the = value => value

/**
 * @param {string} reason
 * @returns {never}
 */
export const panic = reason => {
  throw new Error(reason)
}

/**
 * @param {{ raw: readonly string[] | ArrayLike<string>}} template
 * @param {never} [subject]
 * @param {unknown[]} substitutions
 * @returns {never}
 */
export const unreachable = (template, subject, ...substitutions) =>
  panic(String.raw(template, JSON.stringify(subject), ...substitutions))

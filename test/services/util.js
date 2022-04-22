/**
 * @template [T=undefined]
 * @param {T} value
 */
export const ok = (value = /** @type {any} */ (undefined)) => ({
  ok: the(true),
  value,
})

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

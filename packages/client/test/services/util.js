export const ok =
  /** @type {<T, Args extends []|[T]>(...args:Args) => Args extends [T] ? {ok:true, value:T extends undefined ? null : T} : {ok:true, value:null}}} */ (
    value => (value == undefined ? Ok : { ok: true, value })
  )

const Ok = { ok: true, value: null }
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

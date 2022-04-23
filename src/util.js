export const ok =
  /** @type {<Args extends []|[unknown]>(...args:Args) => Args extends [infer T] ? {ok:true, value:T} : {ok:true, value:null}}} */ (
    value => (value == undefined ? Ok : { ok: true, value })
  )

const Ok = { ok: true, value: null }

/**
 * @template T
 * @typedef {[]|[T]|[T,T]|[T,T,T]|[T,T,T,T]|[T,T,T,T,T]|[T,T,T,T,T,T]|[T,T,T,T,T,T]} Tuple
 */
/**
 * @template {string|boolean|number|Tuple<unknown>} T
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

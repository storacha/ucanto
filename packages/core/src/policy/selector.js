import * as API from './api.js'

/**
 *
 * @param {API.Selector} selector
 * @param {API.Data} subject
 */
export const select = (selector, subject) => {
  const { error, ok: path } = parse(selector)
  if (error) {
    return { error }
  } else {
    return resolve(path, subject)
  }
}

/**
 * @param {API.SelectorSegment[]} path
 * @param {API.Data} subject
 * @returns {API.SelectionResult}
 */
export const resolve = (path, subject) => {
  let current = subject
  for (const [offset, segment] of path.entries()) {
    if (segment === Identity) {
      continue
    }
    // If the segment is iterator, we are going to descend into the members of
    // the current object or array.
    else if (segment === Iterator) {
      const many = []
      // However if we can only descend if the current subject is an object or
      // an array.
      if (current && typeof current === 'object') {
        const subpath = path.slice(offset + 1)
        const keys = Array.isArray(current)
          ? current.keys()
          : Object.keys(current).sort()
        for (const key of keys) {
          const member = current[/** @type {keyof current} */ (key)]
          const result = resolve(subpath, member)
          if (result.error) {
            return result
          } else if (result.many) {
            many.push(...result.many)
          } else {
            many.push(result.one)
          }
        }
        return { many }
      } else {
        return {
          error: new TypeError(`Can not iterate over ${typeof current}`),
        }
      }
    } else if (typeof segment === 'number') {
      if (Array.isArray(current) || ArrayBuffer.isView(current)) {
        current = segment in current ? current[segment] : null
      } else {
        return {
          error: new TypeError(
            `Can not index ${
              current === null ? null : typeof current
            } with number ${segment}`
          ),
        }
      }
    } else if (typeof segment === 'string') {
      if (current == null) {
        return { one: null }
      } else if (ArrayBuffer.isView(current)) {
        return {
          error: new TypeError(
            `Can not access field ${JSON.stringify(segment)} on Uint8Array`
          ),
        }
      } else if (Array.isArray(current)) {
        return {
          error: new TypeError(
            `Can not access field ${JSON.stringify(segment)} on array`
          ),
        }
      } else if (typeof current === 'object') {
        const key = segment.replace(/\\\"/g, '"')
        current = key in current ? current[key] : null
      } else {
        return {
          error: new TypeError(
            `Can not access field ${JSON.stringify(
              segment
            )} on ${typeof current}`
          ),
        }
      }
    } else {
      const [start = 0, end] = segment
      if (
        Array.isArray(current) ||
        ArrayBuffer.isView(current) ||
        typeof current === 'string'
      ) {
        current = current.slice(start, end)
      } else {
        return {
          error: new TypeError(
            `Can not slice ${start}:${end} from ${typeof current}`
          ),
        }
      }
    }
  }

  return { one: current }
}

export const Identity = '.'
export const Iterator = '[]'

/**
 * @param {API.Selector} selector
 * @returns {Iterable<string>}
 */
export function* tokenize(selector) {
  const { length } = selector
  let offset = 0
  let column = 0
  let context = ''

  while (column < length) {
    const char = selector[column]
    if (char === '"' && selector[column - 1] !== '\\') {
      column++
      context = context === '"' ? '' : '"'
      continue
    }

    if (context === '"') {
      column++
      continue
    }

    switch (char) {
      case '.': {
        if (offset < column) {
          yield selector.slice(offset, column)
        }
        offset = column
        column++
        break
      }
      case '[': {
        if (offset < column) {
          yield selector.slice(offset, column)
        }
        offset = column
        column++
        break
      }
      case ']': {
        column++
        yield selector.slice(offset, column)
        offset = column
        break
      }
      default: {
        column++
      }
    }
  }

  if (offset < column && context != '"') {
    yield selector.slice(offset, column)
  }
}

/**
 *
 * @param {API.Selector} selector
 * @returns {API.SelectorParseResult}
 */
export const parse = selector => {
  if (selector[0] !== Identity) {
    return {
      error: new ParseError(`Selector must start with identity segment "."`),
    }
  }

  const segments = []
  let offset = 0
  for (const token of tokenize(selector)) {
    const segment = token.replace(/\s+/g, '')
    switch (segment) {
      case Identity: {
        if (segments[segments.length - 1] === Identity) {
          return {
            error: new ParseError(
              `Selector contains unsupported recursive descent segment ".."`
            ),
          }
        }
        segments.push(segment)
        break
      }
      case Iterator: {
        segments.push(segment)
        break
      }
      default: {
        if (segment[0] === '[' && segment[segment.length - 1] === ']') {
          const lookup = segment.slice(1, -1)
          if (/^\d+$/.test(lookup)) {
            segments.push(parseInt(lookup, 10))
          } else if (lookup[0] === '"' && lookup[lookup.length - 1] === '"') {
            segments.push(lookup.slice(1, -1))
          } else if (/^((\-?\d+:\-?\d*)|(\-?\d*:\-?\d+))$/.test(lookup)) {
            const [left, right] = lookup.split(':')
            const start = left !== '' ? parseInt(left, 10) : undefined
            const end = right !== '' ? parseInt(right, 10) : undefined
            segments.push([start, end])
          } else {
            return {
              error: new ParseError(
                `Selector contains invalid segment ${JSON.stringify(
                  segment
                )} at ${offset}:${offset + token.length}`
              ),
            }
          }
        } else if (/^\.[a-zA-Z_]*$/.test(segment)) {
          segments.push(segment.slice(1))
        } else {
          return {
            error: new ParseError(
              `Selector contains invalid segment ${JSON.stringify(
                segment
              )} at ${offset}:${offset + token.length}`
            ),
          }
        }
      }
    }
    offset += token.length
  }

  if (offset < selector.length) {
    return {
      error: new ParseError(
        `Selector contains invalid segment ${JSON.stringify(
          selector.slice(offset)
        )} with unterminated string literal`
      ),
    }
  }

  return { ok: /** @type {API.SelectorPath} */ (segments) }
}

class ParseError extends Error {
  name = /** @type {const} */ ('ParseError')
}

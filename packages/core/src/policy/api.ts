import type { Variant, Result, Phantom } from '@ucanto/interface'

export type { Variant, Result }

export type SelectorParseResult = Result<SelectorPath, ParseError>

export interface ParseError extends Error {
  readonly name: 'ParseError'
}

/**
 * Selector use [jq](https://devdocs.io/jq/) notation.
 */
export type Selector = `.${string}` & Phantom<{ Selector: SelectorPath }>
export type SelectorPath = [IdentitySegment, ...SelectorSegment[]]

export type SelectionResult = Variant<{
  one: Data
  many: Data[]
  error: ParseError | TypeError
}>

export type SelectorSegment =
  | IdentitySegment
  | IteratorSegment
  | IndexSegment
  | KeySegment
  | SliceSegment

export type Data =
  | number
  | string
  | boolean
  | null
  | Uint8Array
  | ListData
  | Dictionary

export interface ListData extends Array<Data> {}
export interface Dictionary {
  [key: string]: Data
}

/**
 * Represents an identity selector per jq.
 * @see https://devdocs.io/jq/index#identity
 *
 * @example
 * ```js
 * assert.deepEqual(
 *    select('.', {x: 1}),
 *    { one: { x: 1 } }
 * )
 * ```
 */
export type IdentitySegment = '.' & Phantom<{ Identity: '.' }>

/**
 * Selector that returns all elements of an array.  Selecting `.[]` from
 * `[1,2,3]` will produce selection containing those numbers. The form `.foo.[]`
 * is identical to `.foo[]`.
 *
 * You can also use the `[]` on the object, and it will return all the values of
 * the object.
 *
 * @example
 * ```js
 * assert.deepEqual(
 *   select('.[]', [
 *     {"name":"JSON", "good":true},
 *     {"name":"XML", "good":false}
 *   ]),
 *   {
 *     many: [
 *       {"name":"JSON", "good":true},
 *       {"name":"XML", "good":false}
 *     ]
 *   }
 * )
 * ```
 */
export type IteratorSegment = '[]' & Phantom<{ Iterator: '[]' }>

export type IndexSegment = number & Phantom<{ Index: number }>

export type KeySegment = string & Phantom<{ Key: string }>

export type SliceSegment = [start?: number, end?: number]

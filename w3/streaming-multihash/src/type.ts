import type { MultihashDigest } from 'multiformats/hashes/interface'

export interface StreamingMultihashHasher<Code extends number = number> {
  readonly code: Code

  create(): StreamingHasher<Code>
}

export interface StreamingHasher<Code extends number = number> {
  write(input: Uint8Array): this
  close(): Await<MultihashDigest<Code>>
}

export type AwaitIterable<T> = Iterable<Await<T>> | AsyncIterable<T>

export type Await<T> = T | PromiseLike<T>

export interface RawHasher {
  update(input: Uint8Array): this
  digest(): Uint8Array
}
